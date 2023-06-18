import { type Image, createCanvas, loadImage } from '@napi-rs/canvas';
import { type Cosmetic, type EpicAccount, FortniteAPIError } from '@squiddleton/fortnite-api';
import { formatPossessive, getRandomItem, normalize, quantify, removeDuplicates, sum } from '@squiddleton/util';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, type Client, type ColorResolvable, Colors, type CommandInteraction, ComponentType, EmbedBuilder, type InteractionReplyOptions, type MessageActionRowComponentBuilder, PermissionFlagsBits, type Snowflake, StringSelectMenuBuilder, bold, codeBlock, time, underscore } from 'discord.js';
import { type DiscordClient, EpicError, TimestampedEmbed } from './classes.js';
import { AccessibleChannelPermissions, BackgroundURL, ChapterLengths, EpicEndpoint, EpicErrorCode, ErrorMessage, RarityColors, Time } from './constants.js';
import { getLevels, getTimeline } from './epic.js';
import { createPaginationButtons, isKey, messageComponentCollectorFilter, paginate } from './functions.js';
import type { ButtonOrMenu, CosmeticCache, Dimensions, DisplayUserProperties, FortniteWebsite, LevelCommandOptions, Link, Links, StatsCommandOptions, StatsEpicAccount, StringOption, TimelineClientEvent } from './types.js';
import epicClient from '../clients/epic.js';
import fortniteAPI from '../clients/fortnite.js';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';
import userModel from '../models/users.js';

const cosmeticCache: CosmeticCache = {
	cosmetics: [],
	lastUpdatedTimestamp: 0
};

/**
 * Returns all known Fortnite cosmetics via Fortnite-API.
 *
 * @remarks
 *
 * Periodically updates the cached cosmetics and returns those instead of always fetching from the API.
 *
 * @returns An array of cosmetic objects
 */
export const fetchCosmetics = async () => {
	const now = Date.now();
	if (cosmeticCache.cosmetics.length === 0 || ((cosmeticCache.lastUpdatedTimestamp + Time.CosmeticCacheUpdate) < now)) {
		cosmeticCache.cosmetics = await fortniteAPI.listCosmetics();
		cosmeticCache.lastUpdatedTimestamp = now;
	}
	const { cosmetics } = cosmeticCache;
	return cosmetics;
};

/**
 * Returns the cosmetics currently in the Fortnite item shop.
 *
 * @returns An array of cosmetic objects
 */
export const fetchItemShop = async () => {
	const rawAPI = await fortniteAPI.shop({ combined: true });

	const withoutDupes: Cosmetic[] = [];
	const withDupes = rawAPI.featured!.entries.concat(rawAPI.daily!.entries).map(e => e.items).flat();

	for (const item of withDupes) {
		if (!withoutDupes.some(c => c.id === item.id)) withoutDupes.push(item);
	}
	return withoutDupes;
};

/**
 * Returns the names of the shop tabs in a client event state.
 *
 * @param state - The client event state from Epic Games' timeline API
 * @returns An array of shop tab names
 */
export const fetchShopNames = async (state: TimelineClientEvent) => {
	const fortniteWebsite: FortniteWebsite = await fetch(EpicEndpoint.Website).then(r => EpicError.validate(r));
	const shopSections = fortniteWebsite.shopSections.sectionList.sections;

	const shopIds = Object.keys(state.state.sectionStoreEnds);

	const namesWithoutQuantity = shopIds
		.map(id => {
			const returned = shopSections.find(s => s.sectionId === id);
			if (returned === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', 'undefined'));
			return returned;
		})
		.sort((a, b) => b.landingPriority - a.landingPriority)
		.map(s => (s.sectionDisplayName === undefined || s.sectionDisplayName === '') ? 'Featured' : s.sectionDisplayName);

	return Object.entries(quantify(namesWithoutQuantity)).map(([name, amount]) => `${name}${amount === 1 ? '' : ` x ${amount}`}`);
};

/**
 * Returns the current client event states from Epic Games' timeline API
 */
export const fetchStates = () => getTimeline().then(timeline => timeline.channels['client-events'].states);

export const findCosmetic = async (input: string) => {
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
			const list = await fetchCosmetics();
			input = normalize(input);
			return list.find(c => normalize(c.name) === input) ?? null;
		}
	}
};

/**
 * Notifies all users with wishlisted items in the current Fortnite item shop.
 *
 * @param client - A Discord client instance
 * @param debug - Whether the output should only be logged instead of sent to Discord wishlist channels
 */
export const checkWishlists = async (client: DiscordClient<true>, debug = false) => {
	const entries = await fetchItemShop();
	const userResults = await userModel.find({ wishlistCosmeticIds: { $in: entries.map(c => c.id) } });
	const userIds = userResults.map(u => u._id);
	const guildResults = await guildModel.find({ wishlistChannelId: { $ne: null } });

	for (const guildResult of guildResults) {
		const guild = client.guilds.cache.get(guildResult._id);
		if (guild !== undefined) {
			const members = userResults.length > 100
				? (await guild.members.fetch()).filter(m => userIds.includes(m.id))
				: await guild.members.fetch({ user: userIds });

			if (members.size !== 0) {
				const messages = ['Today\'s shop includes the following items from members\' wishlists:\n'];

				for (const user of userResults.filter(u => members.has(u._id))) {
					const items = removeDuplicates(entries.filter(e => user.wishlistCosmeticIds.includes(e.id)).map(c => c.name));
					if (items.length > 0) {
						messages.push(`<@${user._id}>: ${items.join(', ')}`);
					}
				}

				if (messages.length !== 1 && guildResult.wishlistChannelId !== null) {
					const channel = client.channels.cache.get(guildResult.wishlistChannelId);
					const unbindChannel = async (reason: string) => {
						console.log(reason);
						guildResult.wishlistChannelId = null;
						await guildResult.save();
					};
					if (channel === undefined) {
						await unbindChannel(`Wishlist channel ${guildResult.wishlistChannelId} (Guild ${guildResult._id}) is uncached and has been unbound.`);
						continue;
					}
					else if (!channel.isTextBased() || channel.isDMBased()) {
						await unbindChannel(`Wishlist channel ${channel.id} is not text-based or is DM-based and has been unbound.`);
						continue;
					}
					const permissions = client.getPermissions(channel);
					if (!permissions.has(AccessibleChannelPermissions)) {
						await unbindChannel(`Wishlist channel ${channel.id} is missing the necessary client permissions and has been unbound.`);
						continue;
					}

					messages.push('\nIf you have purchased your item, use </wishlist remove:1000092959875793080>.\nDo you want to create your own wishlist?  Check out </wishlist add:1000092959875793080>!');

					const fullMsg = messages.join('\n');
					if (debug) {
						console.log(fullMsg);
					}
					else {
						try {
							for (const content of fullMsg.match(/(.|[\r\n]){1,2000}/g) ?? []) {
								await channel.send(content);
							}
						}
						catch (error) {
							console.error('An error has occured while posting a wishlist announcement', guildResult, error);
						}
					}
				}
			}
		}
	}
};

/**
 * Returns an embed describing a cosmetic.
 *
 * @param cosmetic - A cosmetic object
 * @returns An embed filled with information about the specified cosmetic
 */
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
		embed.addFields({ name: 'Shop History', value: `First: ${time(new Date(debut))}\nLast: ${time(new Date(cosmetic.shopHistory.at(-1) ?? debut))}\nTotal: ${cosmetic.shopHistory.length}`, inline: true });
	}
	if (cosmetic.customExclusiveCallout !== undefined) embed.addFields({ name: 'Exclusive', value: cosmetic.customExclusiveCallout, inline: true });
	return embed;
};

/**
 * Creates an image of a locker loadout.
 *
 * @param outfit - The outfit's name, or null if none
 * @param backbling - The back bling's name, or null if none
 * @param pickaxe - The pickaxe's name, or null if none
 * @param glider - The glider's name, or null if none
 * @param wrap - The wrap's name, or null if none
 * @param chosenBackground - The background color, or null if random
 * @param links - An object with keys of each cosmetic type and values of each cosmetic's image URL
 * @returns A Discord attachment containing the image of the loadout or a string containing an error message
 */
export const createLoadoutAttachment = async (outfit: StringOption, backbling: StringOption, pickaxe: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, links: Links = {}) => {
	const cosmetics = await fetchCosmetics();
	const noBackground = chosenBackground === null;
	if (!noBackground && !isKey(chosenBackground, BackgroundURL)) throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', chosenBackground));
	const rawBackground = noBackground ? getRandomItem(Object.values(BackgroundURL)) : BackgroundURL[chosenBackground];
	const background = await loadImage(rawBackground);
	const canvas = createCanvas(background.width, background.height);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	/**
	 * Draws an image of the cosmetic on the canvas.
	 *
	 * @param input - The cosmetic's name
	 * @param displayType - The cosmetic's type that will be displayed in the error message
	 * @param types - The cosmetic's possible types in-game
	 * @returns Void if successful or a string containing an error message
	 */
	const handleImage = async (input: StringOption, types: string[], displayType: Link) => {
		let image: Image | null = null;
		const link = links[displayType];

		if (link !== undefined) {
			image = await loadImage(link);
		}
		else if (input !== null) {
			const cosmetic = cosmetics.find(c => types.includes(c.type.value) && normalize(c.name.toLowerCase().replace(/ /g, '')) === normalize(input));
			if (cosmetic === undefined) {
				return `No ${displayType} matches your query.`;
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
				Pickaxe: [
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
				],
				Wrap: [
					background.width - (background.height * image.width / image.height / 2),
					background.height / 2,
					background.height * image.width / image.height / 2,
					background.height / 2
				]
			};
			ctx.drawImage(image, ...dimensions[displayType]);
		}
	};

	const args: [StringOption, string[], Link][] = [
		[outfit, ['outfit'], 'Outfit'],
		[backbling, ['backpack', 'petcarrier'], 'Back Bling'],
		[pickaxe, ['pickaxe'], 'Pickaxe'],
		[glider, ['glider'], 'Glider'],
		[wrap, ['wrap'], 'Wrap']
	];
	for (const arg of args) {
		const returned = await handleImage(...arg);
		if (returned !== undefined) return returned;
	}

	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'loadout.png' });
};

/**
 * Sends a message of a loadout with buttons to edit each cosmetic's styles.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param attachment - The attachment of the loadout image
 * @param outfit - The outfit's name, or null if none
 * @param backbling - The back bling's name, or null if none
 * @param pickaxe - The pickaxe's name, or null if none
 * @param glider - The glider's name, or null if none
 * @param wrap - The wrap's name, or null if none
 * @param chosenBackground - The background color, or null if random
 * @param embeds - An array of embeds imitating a Twitter post
 */
export const createStyleListeners = async (interaction: ChatInputCommandInteraction, attachment: AttachmentBuilder, outfit: StringOption, backbling: StringOption, pickaxe: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, embeds: TimestampedEmbed[] = []) => {
	const cosmetics = await fetchCosmetics();
	if (chosenBackground !== null && !isKey(chosenBackground, BackgroundURL)) throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', chosenBackground));

	let components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

	const handleVariants = (input: StringOption, types: string[], displayType: string) => {
		if (input !== null) {
			const cosmetic = cosmetics.find(c => types.includes(c.type.value) && normalize(c.name.toLowerCase().replace(/ /g, '')) === normalize(input));
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

	const variantArgs: [StringOption, string[], string][] = [
		[outfit, ['outfit'], 'Outfit'],
		[backbling, ['backpack', 'petcarrier'], 'Back Bling'],
		[pickaxe, ['pickaxe'], 'Pickaxe'],
		[glider, ['glider'], 'Glider']
	];
	variantArgs.forEach(arg => handleVariants(...arg));

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

	const message = await interaction.editReply({ components, content, files: [attachment], embeds });
	if (components.length > 0) {
		const collector = message.createMessageComponentCollector<ButtonOrMenu>({ filter: messageComponentCollectorFilter(interaction), time: Time.CollectorDefault });
		const options: Record<string, string> = {};

		collector
			.on('collect', async i => {
				if (i.customId === 'lock') {
					await i.update({ components: [], content, embeds });
					return;
				}
				await i.deferUpdate();

				if (!i.isStringSelectMenu()) throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', i.componentType.toString()));
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

						const newAttachmentBuilder = await createLoadoutAttachment(outfit, backbling, pickaxe, glider, wrap, chosenBackground, options);
						components = components.map(c => {
							const [menu] = c.components;
							const menuJSON = menu.toJSON();
							if (menuJSON.type === ComponentType.Button || (menuJSON.type === ComponentType.StringSelect && menuJSON.custom_id !== cosmetic.id)) return c;

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

/**
 * Returns the content for a message containing a user's final level in each Fortnite season.
 *
 * @param client - A ready Discord client
 * @param options - Options specifying the Discord user and their Epic Games account
 * @returns Options for replying to an interaction and, if found, the user's Epic Games account
 */
export const getLevelsString = async (client: Client<true>, options: LevelCommandOptions): Promise<InteractionReplyOptions & { account?: EpicAccount }> => {
	/**
	 * Returns a string including each Fortnite season and the user's respective level.
	 *
	 * @param levels - An object with keys of the seasons and values of the user's level in the season
	 * @param name - The user's Epic Games account username
	 * @returns A string with a header including the user's Epic Games username and a body of the user's levels in each season
	 */
	const formatLevels = (levels: Record<string, number>, name: string) => `${bold(`Battle Pass Levels for ${name}`)}\n\n${Object
		.entries(levels)
		.sort()
		.map(([k, v]) => {
			const overallSeason = parseInt(k.match(/\d+/)![0]);
			const index = ChapterLengths.findIndex((length, i) => overallSeason <= ChapterLengths.slice(0, i + 1).reduce(sum));
			const chapterIndex = (index === -1 ? ChapterLengths.length : index);
			return `Chapter ${chapterIndex + 1}, Season ${overallSeason - ChapterLengths.slice(0, chapterIndex).reduce(sum)}: ${Math.floor(v / 100)}`;
		})
		.join('\n')}`;

	/**
	 * Returns a string representative of an error thrown from fetching a user's levels.
	 *
	 * @param e - The thrown error
	 * @returns A string explaining the error to the command user
	 */
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
		else if (e instanceof EpicError) {
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

	const { accountName, accountType } = options;

	if (accountName === null) {
		const userResult = await userModel.findById(options.targetUser.id);
		if (userResult === null || userResult.epicAccountId === null) {
			return { content: `No player username was provided, and you have not linked your account with ${client.user.username}.`, ephemeral: true };
		}

		try {
			const [levels] = await getLevels([userResult.epicAccountId]);
			return { content: formatLevels(levels, options.targetUser.username) };
		}
		catch (error) {
			return { content: handleLevelsError(error), ephemeral: true };
		}
	}
	else {
		try {
			const { account } = await fortniteAPI.stats({ name: accountName, accountType });
			const [levels] = await getLevels([account.id]);
			return { content: formatLevels(levels, account.name), account };
		}
		catch (error) {
			return { content: handleLevelsError(error), ephemeral: true };
		}
	}
};

/**
 * Replies to an interaction with an error message thrown from fetching a user's stats.
 *
 * @remarks
 *
 * Re-throws the error if it is not an instance of the FortniteAPIError class.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param e - The thrown error
 */
export const handleStatsError = async (interaction: CommandInteraction, e: unknown) => {
	if (!(e instanceof FortniteAPIError)) throw e;
	switch (e.code) {
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

/**
 * Links a Discord user's account to an Epic Games account.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param account - An Epic Games account object
 * @param ephemeral - Whether the response should only be visible to the user
 */
export const linkEpicAccount = async (interaction: ChatInputCommandInteraction, account: StatsEpicAccount, ephemeral = false) => {
	await userModel.findByIdAndUpdate(interaction.user.id, { epicAccountId: account.id }, { upsert: true });
	await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, ephemeral });
};

/**
 * Replies to an interaction with an image of a user's Fortnite stats.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param options - Options for getting the user's Epic Games account
 * @param content - A message to send alongside the stats image
 */
export const getStatsImage = async (interaction: CommandInteraction, options: StatsCommandOptions, content?: string) => {
	await interaction.deferReply({ ephemeral: interaction.isContextMenuCommand() });

	const getRankedContent = async (epicAccountId: string) => {
		const progress = await epicClient.fortnite.getTrackProgress({ accountId: epicAccountId });

		const transformTrack = (rankingType: string, displayName: string) => {
			const track = progress.find(t => t.rankingType === rankingType);
			if (track === undefined) throw new Error(`No track was found for ${displayName}`);
			const divisionNames = ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Diamond I', 'Diamond II', 'Diamond III', 'Platinum I', 'Platinum II', 'Platinum III', 'Elite', 'Champion', 'Unreal'];
			return `${displayName}: ${divisionNames[track.currentDivision]} (${Math.round(track.promotionProgress * 100)}%)${track.currentPlayerRanking === null ? '' : `; Player Ranking: ${track.currentPlayerRanking}`} (Last Updated: ${time(new Date(track.lastUpdated), 'R')})`;
		};

		return `${bold('Ranked Stats')}\n\n${transformTrack('ranked-br', 'Battle Royale')}\n${transformTrack('ranked-zb', 'Zero Build')}`;
	};

	if (options.accountName === null) {
		const userResult = await userModel.findById(options.targetUser.id);
		if (userResult === null || userResult.epicAccountId === null) {
			if (content !== undefined) await interaction.editReply(`${options.targetUser.username} has not linked their Epic account with </link:1032454252024565821>.`);
			else await interaction.editReply('No player username was provided, and you have not linked your account with </link:1032454252024565821>.');
		}
		else {
			try {
				const rankedContent = await getRankedContent(userResult.epicAccountId);
				if (typeof content === 'string') content += `\n\n${rankedContent}`;
				else content = rankedContent;

				const { image } = await fortniteAPI.stats({ id: userResult.epicAccountId, image: options.input, timeWindow: options.timeWindow });

				await interaction.editReply({ content, files: [image] });
			}
			catch (error) {
				await handleStatsError(interaction, error);
			}
		}
	}
	else {
		try {
			const { image, account } = await fortniteAPI.stats({ name: options.accountName, accountType: options.accountType, image: options.input, timeWindow: options.timeWindow });
			await interaction.editReply({ content: await getRankedContent(account.id), files: [image] });

			if (interaction.isChatInputCommand() && interaction.options.getBoolean('link')) await linkEpicAccount(interaction, account, true);
		}
		catch (error) {
			await handleStatsError(interaction, error);
		}
	}
};

/**
 * Gives a member a milestone.
 *
 * @param userId - The target member's id
 * @param guildId - The target member's guild id
 * @param milestoneName - The name of the milestone to grant
 * @returns The member's database document pre-update
 */
export const grantMilestone = (userId: Snowflake, guildId: Snowflake, milestoneName: string) => memberModel.updateOne(
	{ userId, guildId },
	{ $addToSet: { milestones: milestoneName } },
	{ upsert: true }
);

/**
 * Posts leaked shop sections across all subscribed channels.
 *
 * @param client - A Discord client instance
 * @param currentNamesOrUndefined - The display names of the current shop tabs
 * @param cachedNames - The display names of the past shop tabs
 * @returns Whether the new shop tab names and quantities are different than the old ones
 */
export const postShopSections = async (client: DiscordClient<true>, currentNamesOrUndefined?: string[], cachedNames: string[] = []) => {
	const [oldState, newState] = await fetchStates();
	const currentNames = currentNamesOrUndefined ?? await fetchShopNames(newState ?? oldState);

	const addedNames = currentNames
		.filter(n => !cachedNames.includes(n))
		.map(n => `+ ${n}`);
	const removedNames = cachedNames
		.filter(n => !currentNames.includes(n))
		.map(n => `- ${n}`);

	if ([addedNames, removedNames].every(names => names.length === 0)) return false;

	const keptNames = currentNames
		.filter(n => cachedNames.includes(n))
		.map(n => `  ${n}`);

	const formattedNames = addedNames.concat(keptNames, removedNames);

	const guildResults = await guildModel.find({ shopSectionsChannelId: { $ne: null } });
	for (const guildResult of guildResults) {
		const { shopSectionsChannelId } = guildResult;
		if (shopSectionsChannelId !== null) {
			const channel = client.channels.cache.get(shopSectionsChannelId);
			const unbindChannel = async (reason: string) => {
				console.log(reason);
				guildResult.shopSectionsChannelId = null;
				await guildResult.save();
			};
			if (channel === undefined) {
				await unbindChannel(`Shop section channel ${shopSectionsChannelId} (Guild ${guildResult._id}) is uncached and has been unbound.`);
				continue;
			}
			else if (!channel.isTextBased() || channel.isDMBased()) {
				await unbindChannel(`Shop section channel ${channel.id} is not text-based or is DM-based and has been unbound.`);
				continue;
			}
			const permissions = client.getPermissions(channel);
			if (!permissions.has([...AccessibleChannelPermissions, PermissionFlagsBits.EmbedLinks])) {
				await unbindChannel(`Shop section channel ${channel.id} is missing the necessary client permissions and has been unbound.`);
				continue;
			}

			try {
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
	return true;
};

/**
 * Replies to an interaction with a user's wishlisted items
 *
 * @param interaction - The command interaction that initiated this function call
 */
export const viewWishlist = async (interaction: CommandInteraction) => {
	/**
	 * Returns properties of a user or member used in a wishlist embed.
	 *
	 * @returns An object containing properties such as a color and avatar URL
	 */
	const getUserProperties = async (): Promise<DisplayUserProperties> => {
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

	const user = await getUserProperties();
	if (interaction.isUserContextMenuCommand()) await interaction.deferReply({ ephemeral: !user.same });

	const userResult = await userModel.findById(user.id);
	if (!userResult?.wishlistCosmeticIds.length) {
		await interaction.editReply({ content: `${user.same ? 'Your' : formatPossessive(user.username)} wishlist is currently empty.` });
		return;
	}

	const cosmetics = await fetchCosmetics();
	const inc = 25;
	const cosmeticStrings = userResult.wishlistCosmeticIds
		.map(id => {
			const cosmetic = cosmetics.find(c => c.id === id);
			if (cosmetic === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', id));
			const type = cosmetic.type.displayValue;
			return `${cosmetic.name}${type === 'Outfit' ? '' : ` (${type})`}`;
		})
		.sort((a, b) => a.localeCompare(b));

	const embed = new TimestampedEmbed()
		.setColor(user.color)
		.setDescription(`${underscore(`Cosmetics (${cosmeticStrings.length}):`)}\n${cosmeticStrings.slice(0, inc).join('\n')}`)
		.setThumbnail(user.avatar)
		.setTitle(`${formatPossessive(user.username)} Wishlist`);

	const willUseButtons = cosmeticStrings.length > inc;
	const buttons = createPaginationButtons();

	const message = await interaction.editReply({
		components: willUseButtons ? [new ActionRowBuilder<ButtonBuilder>({ components: Object.values(buttons) })] : [],
		embeds: [embed]
	});

	if (willUseButtons) paginate(interaction, message, embed, buttons, 'Cosmetics', cosmeticStrings, inc);
};