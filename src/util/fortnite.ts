import { Image, createCanvas, loadImage } from '@napi-rs/canvas';
import { Cosmetic, FortniteAPIError } from '@squiddleton/fortnite-api';
import { formatPossessive, getRandomItem, normalize, quantify, removeDuplicates, sum } from '@squiddleton/util';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, ColorResolvable, Colors, CommandInteraction, ComponentType, EmbedBuilder, MessageActionRowComponentBuilder, Snowflake, StringSelectMenuBuilder, codeBlock, time } from 'discord.js';
import fortniteAPI from '../clients/fortnite.js';
import guildSchema from '../schemas/guilds.js';
import memberSchema from '../schemas/members.js';
import userSchema from '../schemas/users.js';
import { DiscordClient, EpicError, TimestampedEmbed } from './classes.js';
import { BackgroundURL, ChapterLengths, CosmeticCacheUpdateThreshold, DefaultCollectorTime, EpicEndpoint, EpicErrorCode, ErrorMessage, RarityColors } from './constants.js';
import { epicFetch, getLevels } from './epic.js';
import { createPaginationButtons, linkEpicAccount, messageComponentCollectorFilter, paginate } from './functions.js';
import { isBackground } from './typeguards.js';
import type { ButtonOrMenu, CosmeticCache, Dimensions, DisplayUserProperties, FortniteWebsite, LevelCommandOptions, Link, Links, StatsCommandOptions, StringOption, Timeline, TimelineClientEvent } from './types.js';

const cosmeticCache: CosmeticCache = {
	cosmetics: [],
	lastUpdatedTimestamp: 0
};

const itemShopFilter = (cosmetic: Cosmetic) => {
	if (cosmetic.shopHistory?.length) return true;

	return cosmetic.gameplayTags !== null &&
	!cosmetic.gameplayTags.includes('Cosmetics.QuestsMetaData.Season10.Visitor') &&
	!['_Sync', '_Owned', '_Follower'].some(w => cosmetic.id.endsWith(w)) &&
	((cosmetic.gameplayTags.includes('Cosmetics.Source.ItemShop')) ||
	(!['Cosmetics.Source.Promo', 'Cosmetics.Source.Granted.SaveTheWorld', 'Cosmetics.Source.testing', 'Cosmetics.QuestsMetaData.Achievements.Umbrella', 'Cosmetics.Source.MandosBountyLTM'].some(tag => cosmetic.gameplayTags?.includes(tag)) &&
	!cosmetic.gameplayTags.some(t => ['BattlePass', 'Cosmetics.Source.Event', 'Challenges', 'SeasonShop'].some(w => t.includes(w))) &&
	!['Recruit', 'null', '[PH] Join Squad'].includes(cosmetic.name)));
};

export const fetchCosmetics = async (itemShopOnly = false) => {
	const now = Date.now();
	if ((cosmeticCache.lastUpdatedTimestamp + CosmeticCacheUpdateThreshold) < now) {
		cosmeticCache.cosmetics = await fortniteAPI.listCosmetics();
		cosmeticCache.lastUpdatedTimestamp = now;
	}
	const { cosmetics } = cosmeticCache;
	return itemShopOnly ? cosmetics.filter(itemShopFilter) : cosmetics;
};

export const fetchItemShop = async () => {
	const rawAPI = await fortniteAPI.shop({ combined: true });

	const withoutDupes: Cosmetic[] = [];
	const withDupes = rawAPI.featured!.entries.concat(rawAPI.daily!.entries).map(e => e.items).flat();

	for (const item of withDupes) {
		if (!withoutDupes.some(c => c.id === item.id)) {
			withoutDupes.push(item);
		}
	}
	return withoutDupes;
};

export const fetchShopNames = async (state: TimelineClientEvent) => {
	const fortniteWebsite: FortniteWebsite = await fetch(EpicEndpoint.Website).then(r => r.json());
	const shopSections = fortniteWebsite.shopSections.sectionList.sections;

	const shopIds = Object.keys(state.state.sectionStoreEnds);

	const namesWithoutQuantity = shopIds
		.map(id => {
			const returned = shopSections.find(s => s.sectionId === id);
			if (returned === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', 'undefined'));
			return returned;
		})
		.sort((a, b) => b.landingPriority - a.landingPriority)
		.map(s => s.sectionDisplayName ?? 'Featured');

	return Object.entries(quantify(namesWithoutQuantity)).map(([name, amount]) => `${name}${amount === 1 ? '' : ` x ${amount}`}`);
};

export const fetchStates = () => epicFetch<Timeline>(EpicEndpoint.Timeline).then(timeline => timeline.channels['client-events'].states);

export const findCosmetic = async (input: string, itemShopOnly = false) => {
	try {
		const cosmeticById = await fortniteAPI.findCosmetic({ id: input });
		return cosmeticById;
	}
	catch {
		try {
			const cosmeticByName = await fortniteAPI.findCosmetic({ name: input });
			return cosmeticByName;
		}
		catch {
			const list = await fetchCosmetics(itemShopOnly);
			input = normalize(input);
			return list.find(c => normalize(c.name) === input) ?? null;
		}
	}
};

export const checkWishlists = async (client: DiscordClient<true>, debug = false) => {
	const entries = await fetchItemShop();
	const userResults = await userSchema.find({ wishlistCosmeticIds: { $in: entries.map(c => c.id) } });
	const guildResults = await guildSchema.find({ wishlistChannelId: { $ne: null } });

	for (const guildResult of guildResults) {
		const guild = client.guilds.cache.get(guildResult._id);
		if (guild !== undefined) {
			const members = userResults.length > 100
				? (await guild.members.fetch()).filter(m => userResults.some(u => u._id === m.id))
				: await guild.members.fetch({ user: userResults.map(u => u._id) });

			if (members.size !== 0) {
				const msgs = ['Today\'s shop includes the following items from members\' wishlists:\n'];

				for (const user of userResults.filter(u => members.has(u._id))) {
					const items = removeDuplicates(entries.filter(e => user.wishlistCosmeticIds.includes(e.id)).map(c => c.name));
					if (items.length > 0) {
						msgs.push(`<@${user._id}>: ${items.join(', ')}`);
					}
				}

				if (msgs.length !== 1 && guildResult.wishlistChannelId !== null) {
					msgs.push('\nIf you have purchased your item, use </wishlist remove:1000092959875793080>.\nDo you want to create your own wishlist?  Check out </wishlist add:1000092959875793080>!');
					try {
						const wishlistChannel = client.getGuildChannel(guildResult.wishlistChannelId);

						const fullMsg = msgs.join('\n');
						if (debug) {
							console.log(fullMsg);
						}
						else {
							for (const message of fullMsg.match(/(.|[\r\n]){1,2000}/g) ?? []) {
								await wishlistChannel.send(message);
							}
						}
					}
					catch (error) {
						console.error('An error has occured while posting a wishlist announcement', guildResult, error);
					}
				}
			}
		}
	}
};

export const createCosmeticEmbed = (cosmetic: Cosmetic) => {
	const color = RarityColors[cosmetic.rarity.displayValue] ?? 'Random';

	const embed = new TimestampedEmbed()
		.setTitle(cosmetic.name)
		.setDescription(cosmetic.description)
		.setColor(cosmetic.series === null ? color : (cosmetic.series.colors[0].slice(0, 6) as ColorResolvable))
		.setThumbnail(cosmetic.images.smallIcon)
		.setImage(cosmetic.images.featured ?? cosmetic.images.icon)
		.setFields([
			{ name: 'Type', value: cosmetic.type.displayValue, inline: true },
			{ name: 'Rarity', value: cosmetic.rarity.displayValue, inline: true },
			{ name: 'Set', value: cosmetic.set === null ? 'None' : cosmetic.set.value, inline: true },
			{ name: 'Introduction', value: cosmetic.introduction === null ? 'N/A' : `Chapter ${cosmetic.introduction.chapter}, Season ${cosmetic.introduction.season}`, inline: true }
		]);
		// .setFooter({ text: cosmetic.id }); TODO: Un-comment when Discord fixes embed formatting issues
	if (cosmetic.shopHistory !== null) {
		const debut = cosmetic.shopHistory[0];
		embed.addFields({ name: 'Shop History', value: `First: ${time(new Date(debut))}\nLast: ${time(new Date(cosmetic.shopHistory.at(-1) ?? debut))})\nTotal: ${cosmetic.shopHistory.length}`, inline: true });
	}
	if (cosmetic.customExclusiveCallout !== undefined) embed.addFields({ name: 'Exclusive', value: cosmetic.customExclusiveCallout, inline: true });
	return embed;
};

export const createLoadoutAttachment = async (outfit: StringOption, backbling: StringOption, harvestingtool: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, links: Links = {}) => {
	const cosmetics = await fetchCosmetics();
	const noBackground = chosenBackground === null;
	if (!noBackground && !isBackground(chosenBackground)) throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', chosenBackground));
	const rawBackground = noBackground ? getRandomItem(Object.values(BackgroundURL)) : BackgroundURL[chosenBackground];
	const background = await loadImage(rawBackground);
	const canvas = createCanvas(background.width, background.height);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	const handleImage = async (input: StringOption, displayType: Link, displayValues: string[]) => {
		let image: Image | null = null;
		const link = links[displayType];

		if (link !== undefined) {
			image = await loadImage(link);
		}
		else if (input !== null) {
			const cosmetic = cosmetics.find(c => displayValues.includes(c.type.displayValue) && normalize(c.name.toLowerCase().replace(/ /g, '')) === normalize(input));
			if (cosmetic === undefined) {
				throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', displayType));
			}
			image = await loadImage(cosmetic.images.featured ?? cosmetic.images.icon);
		}

		if (image !== null) {
			const dimensions: Dimensions = {
				Outfit: [
					(background.width - (background.height * image.width / image.height)) / 2,
					0,
					background.height * image.width / image.height,
					background.height
				],
				'Back Bling': [
					0,
					0,
					background.height * image.width / image.height / 2,
					background.height / 2
				],
				'Harvesting Tool': [
					0,
					background.height / 2,
					background.height * image.width / image.height / 2,
					background.height / 2
				],
				Glider: [
					background.width - (background.height * image.width / image.height / 2),
					0,
					background.height * image.width / image.height / 2,
					background.height / 2
				]
			};
			ctx.drawImage(image, ...dimensions[displayType]);
		}
	};

	const args: [StringOption, Link, string[]][] = [
		[outfit, 'Outfit', ['Outfit']],
		[backbling, 'Back Bling', ['Back Bling', 'Pet']],
		[harvestingtool, 'Harvesting Tool', ['Harvesting Tool']],
		[glider, 'Glider', ['Glider']]
	];
	for (const arg of args) {
		await handleImage(...arg);
	}

	if (wrap) {
		const cosmetic = cosmetics.find(c => c.type.displayValue === 'Wrap' && normalize(c.name.toLowerCase().replace(/ /g, '')) === normalize(wrap));
		if (!cosmetic) {
			return 'Invalid wrap name provided.';
		}
		const wrapImg = await loadImage(cosmetic.images.featured ?? cosmetic.images.icon);
		ctx.drawImage(wrapImg, background.width - (background.height * wrapImg.width / wrapImg.height / 2), background.height / 2, background.height * wrapImg.width / wrapImg.height / 2, background.height / 2);
	}

	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'loadout.png' });
};

export const createStyleListeners = async (interaction: ChatInputCommandInteraction, attachment: AttachmentBuilder, outfit: StringOption, backbling: StringOption, harvestingtool: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, embeds: TimestampedEmbed[]) => {
	const cosmetics = await fetchCosmetics();
	if (chosenBackground !== null && !isBackground(chosenBackground)) throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', chosenBackground));

	let components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

	const handleVariants = (input: StringOption, displayValues: string[], displayType: string) => {
		if (input !== null) {
			const cosmetic = cosmetics.find(c => displayValues.includes(c.type.displayValue) && normalize(c.name.toLowerCase().replace(/ /g, '')) === normalize(input));
			if (cosmetic !== undefined) {
				const variants = cosmetic.variants?.[0];
				if (variants) {
					components.push(
						new ActionRowBuilder({
							components: [
								new StringSelectMenuBuilder()
									.setCustomId(cosmetic.id)
									.setMinValues(1)
									.setOptions([
										{ label: `Default ${displayType}`, value: 'truedefault', default: true },
										...variants.options.map(o => ({ label: o.name, value: o.tag })).slice(0, 24)
									])
							]
						})
					);
				}
			}
		}
	};

	const args: [StringOption, string[], string][] = [
		[outfit, ['Outfit'], 'Outfit'],
		[backbling, ['Back Bling', 'Pet'], 'Back Bling'],
		[harvestingtool, ['Harvesting Tool'], 'Pickaxe'],
		[glider, ['Glider'], 'Glider']
	];
	args.forEach(arg => handleVariants(...arg));

	if (components.length > 0) {
		components.push(
			new ActionRowBuilder({
				components: [
					new ButtonBuilder()
						.setCustomId('lock')
						.setLabel('Lock Image In')
						.setStyle(ButtonStyle.Danger)
				]
			})
		);
	}

	const content = embeds.length > 0 ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null;

	await interaction.editReply({ components, content, files: [attachment], embeds });
	if (components.length > 0) {
		const message = await interaction.fetchReply();
		const collector = message.createMessageComponentCollector<ButtonOrMenu>({ filter: messageComponentCollectorFilter(interaction), time: DefaultCollectorTime });
		const options: { [key: string]: string } = {};

		collector
			.on('collect', async i => {
				if (i.customId === 'lock') {
					await i.update({ components: [], content, embeds });
					return;
				}
				await i.deferUpdate();

				if (!i.isSelectMenu()) throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', i.componentType.toString()));
				const [value] = i.values;
				const cosmetic = cosmetics.find(c => c.id === i.customId);
				if (cosmetic) {
					const variants = cosmetic.variants?.[0].options;
					if (variants) {
						const imageURL = value.startsWith('truedefault')
							? cosmetic.images.featured ?? cosmetic.images.icon
							: variants.find(v => v.tag === value)?.image;

						if (imageURL === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', value));

						options[cosmetic.type.displayValue] = imageURL;

						const newAttachmentBuilder = await createLoadoutAttachment(outfit, backbling, harvestingtool, glider, wrap, chosenBackground, options);
						components = components.map(c => {
							const [menu] = c.components;
							const menuJSON = menu.toJSON();
							if (menuJSON.type === ComponentType.Button || (menuJSON.type === ComponentType.SelectMenu && menuJSON.custom_id !== cosmetic.id)) return c;

							if (menu instanceof StringSelectMenuBuilder) {
								menu.setOptions(value.startsWith('truedefault')
									? [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault', default: true }, ...variants.map(v => ({ label: v.name, value: v.tag })).slice(0, 24)]
									: [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault' }, ...variants.map(v => ({ label: v.name, value: v.tag, default: v.tag === value })).slice(0, 24)]
								);
							}
							return c.setComponents([menu]);
						});

						await i.editReply({ attachments: [], content, files: [newAttachmentBuilder], components, embeds });
					}
				}
			})
			.once('end', async (collected, reason) => {
				if (reason === 'time') await interaction.editReply({ components: [], content, embeds });
			});
	}
};

const formatLevels = (levels: Record<string, number>, name: string) => `\`${formatPossessive(name)}\` **Battle Pass Levels**\n\n${
	Object
		.entries(levels)
		.sort()
		.map(([k, v]) => {
			const overallSeason = parseInt(k.match(/\d+/)![0]);
			const index = ChapterLengths.findIndex((length, i) => overallSeason <= ChapterLengths.slice(0, i + 1).reduce(sum));
			const chapterIndex = (index === -1 ? ChapterLengths.length : index);
			return `Chapter ${chapterIndex + 1}, Season ${overallSeason - ChapterLengths.slice(0, chapterIndex).reduce(sum)}: ${Math.floor(v / 100)}`;
		})
		.join('\n')}`;

const handleLevelsError = (e: unknown) => {
	if (e instanceof FortniteAPIError) {
		switch (e.code) {
			case 403: {
				return 'This account\'s stats are private. If this is your account, go into Fortnite => Settings => Account and Privacy => Show on Career Leaderboard => On.';
			}
			case 404: {
				return 'No account was found with that username on that platform.';
			}
		}
	}
	if (e instanceof EpicError) {
		if (e.numericErrorCode === EpicErrorCode.InvalidGrant) {
			console.error('The main Epic account credentials must be updated.');
			return 'This bot\'s Epic account credentials must be updated; please try again later.';
		}
		else {
			console.error(e);
			return e.message;
		}
	}
	console.error(e);
	return 'There was an error while fetching the account.';
};

export const getLevelsString = async (client: Client<true>, options: LevelCommandOptions) => {
	const { accountName, accountType } = options;

	if (accountName === null) {
		const userResult = await userSchema.findById(options.targetUser.id);
		if (userResult === null || userResult.epicAccountId === null) {
			return { content: `No player username was provided, and you have not linked your account with ${client.user.username}.`, ephemeral: true };
		}

		try {
			const levels = await getLevels(userResult.epicAccountId);
			return { content: formatLevels(levels, options.targetUser.username) };
		}
		catch (error) {
			return { content: handleLevelsError(error), ephemeral: true };
		}
	}
	else {
		try {
			const { account } = await fortniteAPI.stats({ name: accountName, accountType });
			const levels = await getLevels(account.id);
			return { content: formatLevels(levels, account.name), account };
		}
		catch (error) {
			return { content: handleLevelsError(error), ephemeral: true };
		}
	}
};

export const handleStatsError = async (interaction: CommandInteraction, error: unknown) => {
	if (!(error instanceof FortniteAPIError)) throw error;
	switch (error.code) {
		case 403: {
			await interaction.editReply('This account\'s stats are private. If this is your account, go into Fortnite => Settings => Account and Privacy => Show on Career Leaderboard => On.');
			break;
		}
		case 404: {
			await interaction.editReply('No account was found with that username on that platform.');
			break;
		}
	}
};

export const getStatsImage = async (interaction: CommandInteraction, options: StatsCommandOptions, content?: string) => {
	await interaction.deferReply({ ephemeral: interaction.isContextMenuCommand() });

	if (options.accountName === null) {
		const userResult = await userSchema.findById(options.targetUser.id);
		if (userResult === null || userResult.epicAccountId === null) {
			if (content !== undefined) {
				await interaction.editReply(`${options.targetUser.username} has not linked their Epic account with the ${interaction.client.user.username}.`);
			}
			else {
				await interaction.editReply(`No player username was provided, and you have not linked your account with ${interaction.client.user.username}.`);
			}
			return;
		}

		try {
			const { image } = await fortniteAPI.stats({ id: userResult.epicAccountId, image: options.input, timeWindow: options.timeWindow });
			await interaction.editReply({ content, files: [image] });
		}
		catch (error) {
			await handleStatsError(interaction, error);
		}
	}
	else {
		try {
			const { image, account } = await fortniteAPI.stats({ name: options.accountName, accountType: options.accountType, image: options.input, timeWindow: options.timeWindow });
			await interaction.editReply({ files: [image] });

			if (interaction.isChatInputCommand() && interaction.options.getBoolean('link')) {
				await linkEpicAccount(interaction, account);
			}
		}
		catch (error) {
			await handleStatsError(interaction, error);
		}
	}
};

export const grantMilestone = (userId: Snowflake, guildId: Snowflake, milestoneName: string) => memberSchema.updateOne(
	{ userId, guildId },
	{ $addToSet: { milestones: milestoneName } },
	{ upsert: true }
);

export const postShopSections = async (client: DiscordClient<true>, currentNamesOrUndefined?: string[], cachedNames: string[] = []) => {
	const [oldState, newState] = await fetchStates();
	const currentNames = currentNamesOrUndefined ?? await fetchShopNames(newState ?? oldState);

	const formattedNames = currentNames
		.map(n => `${cachedNames.includes(n) ? ' ' : '+'} ${n}`)
		.concat(cachedNames
			.filter(n => !currentNames.includes(n))
			.map(n => `- ${n}`));

	const guildResults = await guildSchema.find({ shopSectionsChannelId: { $ne: null } });
	for (const { shopSectionsChannelId } of guildResults) {
		if (shopSectionsChannelId !== null) {
			try {
				const channel = client.getGuildChannel(shopSectionsChannelId);
				await channel.send({
					embeds: [
						new EmbedBuilder()
							.setTitle('Shop Sections Update')
							.setDescription(codeBlock('diff', formattedNames.join('\n')))
							.setTimestamp(new Date(oldState.state.dailyStoreEnd))
					]
				});
			}
			catch (error) {
				console.error(error);
			}
		}
	}
};

const getUserProperties = async (interaction: CommandInteraction): Promise<DisplayUserProperties> => {
	const unfetchedUser = interaction.options.getUser('user') ?? interaction.user;
	// Users must be force-fetched to retrieve banners
	const user = await unfetchedUser.fetch();
	const userId = user.id;
	const isSameUser = interaction.user.id === user.id;
	const userData = {
		id: userId,
		username: user.username,
		color: user.accentColor ?? Colors.Purple,
		avatar: user.displayAvatarURL(),
		same: isSameUser
	};

	// Return as a User if the interaction was received in DMs
	if (!interaction.inCachedGuild()) return userData;

	if (isSameUser) {
		return {
			id: userId,
			username: interaction.member.displayName,
			color: interaction.member.displayColor,
			avatar: interaction.member.displayAvatarURL(),
			same: true
		};
	}

	const mentionedMember = interaction.options.getMember('user');
	if (mentionedMember === null) return userData;

	return {
		id: userId,
		username: mentionedMember.displayName,
		color: mentionedMember.displayColor,
		avatar: mentionedMember.displayAvatarURL(),
		same: false
	};
};

export const viewWishlist = async (interaction: CommandInteraction) => {
	const cosmetics = await fetchCosmetics();
	const user = await getUserProperties(interaction);

	const userResult = await userSchema.findById(user.id);
	if (!userResult?.wishlistCosmeticIds.length) {
		await interaction.reply({ content: user.same ? 'You have not added any cosmetics into your wishlist.' : `${user.username} has an empty wishlist.`, ephemeral: true });
		return;
	}

	const inc = 25;
	const cosmeticStrings = userResult.wishlistCosmeticIds
		.map(id => {
			const cosmetic = cosmetics.find(c => c.id === id);
			if (cosmetic === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', id));
			return `${cosmetic.name} (${cosmetic.type.displayValue})`;
		})
		.sort((a, b) => a.localeCompare(b));

	const embed = new TimestampedEmbed()
		.setColor(user.color)
		.setDescription(`Cosmetics (${cosmeticStrings.length}):\n${cosmeticStrings.slice(0, inc).join('\n')}`)
		.setThumbnail(user.avatar)
		.setTitle(`${formatPossessive(user.username)} Wishlist`);

	const willUseButtons = cosmeticStrings.length > inc;
	const buttons = createPaginationButtons();

	const msg = await interaction.reply({
		components: willUseButtons ? [new ActionRowBuilder<ButtonBuilder>({ components: Object.values(buttons) })] : [],
		embeds: [embed],
		ephemeral: !user.same,
		fetchReply: true
	});

	if (willUseButtons) paginate(interaction, msg, embed, buttons, 'Cosmetics', cosmeticStrings, inc);
};