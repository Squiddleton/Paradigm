import { ButtonStyle, ChatInputCommandInteraction, ActionRowBuilder, AttachmentBuilder, ButtonBuilder, EmbedBuilder, SelectMenuBuilder, ComponentType, MessageActionRowComponentBuilder, MessageComponentInteraction, Message, Snowflake, Client, ChannelType, PermissionFlagsBits, ColorResolvable, time } from 'discord.js';
import Canvas from 'canvas';
import { noPunc, randomFromArray } from './functions.js';
import guildSchema from '../schemas/guilds.js';
import memberSchema from '../schemas/members.js';
import userSchema from '../schemas/users.js';
import type { Cosmetic } from '@squiddleton/fortnite-api';
import fortniteAPI from '../clients/fortnite.js';
import { validateChannel } from '@squiddleton/discordjs-util';
import { BackgroundURLs, CosmeticCacheUpdateThreshold, ErrorMessages, RarityColors, RarityOrdering } from './constants.js';
import type { CosmeticCache, StringOption } from './types.js';

const isBackground = (str: string): str is keyof typeof BackgroundURLs => str in BackgroundURLs;

export const isRarity = (rarity: string): rarity is keyof typeof RarityOrdering => rarity in RarityOrdering;

const cosmeticCache: CosmeticCache = {
	cosmetics: [],
	lastUpdatedTimestamp: 0
};

const itemShopFilter = (cosmetic: Cosmetic) => {
	if (cosmetic.shopHistory?.length) return true;

	return cosmetic.gameplayTags !== null &&
	!cosmetic.gameplayTags.includes('Cosmetics.QuestsMetaData.Season10.Visitor') &&
	!['_Sync', '_Owned', '_Follower'].some(end => cosmetic.id.endsWith(end)) &&
	((cosmetic.gameplayTags.includes('Cosmetics.Source.ItemShop')) ||
	(!['Cosmetics.Source.Promo', 'Cosmetics.Source.Granted.SaveTheWorld', 'Cosmetics.Source.testing', 'Cosmetics.QuestsMetaData.Achievements.Umbrella', 'Cosmetics.Source.MandosBountyLTM'].some(tag => cosmetic.gameplayTags?.includes(tag)) &&
	!cosmetic.gameplayTags.some(tag => ['BattlePass', 'Cosmetics.Source.Event', 'Challenges', 'SeasonShop'].some(word => tag.includes(word))) &&
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

export const findCosmetic = async (input: string, itemShopOnly = false) => {
	const list = await fetchCosmetics(itemShopOnly);
	const id = list.find(c => c.id === input) ?? list.find(c => input.includes(c.id));
	if (id !== undefined) return id;
	input = noPunc(input);
	return list.find(c => noPunc(c.name) === input) ?? null;
};

export const fetchItemShop = async () => {
	const rawAPI = await fortniteAPI.shop({ combined: true });

	const withoutDupes: Cosmetic[] = [];
	const withDupes = rawAPI.featured!.entries.concat(rawAPI.daily!.entries).map(entry => entry.items).flat();

	for (const item of withDupes) {
		if (!withoutDupes.some(c => c.id === item.id)) {
			withoutDupes.push(item);
		}
	}
	return withoutDupes;
};

export const checkWishlists = async (client: Client<true>, debug = false) => {
	const entries = await fetchItemShop();
	const users = await userSchema.find({ wishlistCosmeticIds: { $in: entries.map(cosmetic => cosmetic.id) } });
	const guilds = await guildSchema.find({ wishlistChannelId: { $ne: null } });

	for (const g of guilds) {
		const guild = client.guilds.cache.get(g._id);
		if (guild !== undefined) {
			const members = users.length > 100
				? (await guild.members.fetch()).filter(m => users.some(u => u._id === m.id))
				: await guild.members.fetch({ user: users.map(u => u._id) });

			if (members.size !== 0) {
				const msgs = ['Today\'s shop includes the following items from members\' wishlists:\n'];

				for (const user of users.filter(u => members.has(u._id))) {
					const items = [...new Set(entries.filter(item => user.wishlistCosmeticIds.includes(item.id)).map(item => item.name))];
					if (items.length > 0) {
						msgs.push(`<@${user._id}>: ${items.join(', ')}`);
					}
				}

				if (msgs.length !== 1 && g.wishlistChannelId !== null) {
					msgs.push('\nIf you have purchased your item, use the `/wishlist remove` command.\nDo you want to create your own wishlist?  Check out `/wishlist add`!');
					try {
						const wishlistChannel = validateChannel(client, g.wishlistChannelId);
						if (wishlistChannel.type !== ChannelType.DM) {
							const permissions = wishlistChannel.permissionsFor(client.user);
							if (permissions === null) throw new Error(ErrorMessages.UnreadyClient);
							if (permissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
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
						}
					}
					catch (error) {
						console.error('An error has occured while posting a wishlist announcement', g, error);
					}
				}
			}
		}
	}
};

export const createCosmeticEmbed = (cosmetic: Cosmetic) => {
	const color = RarityColors[cosmetic.rarity.displayValue] ?? 'Random';

	const embed = new EmbedBuilder()
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
		])
		.setTimestamp();
		// .setFooter({ text: cosmetic.id }); TODO: Un-comment when Discord fixes embed formatting issues
	if (cosmetic.shopHistory !== null) {
		const debut = cosmetic.shopHistory[0];
		embed.addFields({ name: 'Shop History', value: `First: ${time(new Date(debut))}\nLast: ${time(new Date(cosmetic.shopHistory.at(-1) ?? debut))})\nTotal: ${cosmetic.shopHistory.length}`, inline: true });
	}
	if (cosmetic.customExclusiveCallout !== undefined) embed.addFields({ name: 'Exclusive', value: cosmetic.customExclusiveCallout, inline: true });
	return embed;
};

export const createLoadoutAttachment = async (outfit: StringOption, backbling: StringOption, harvestingtool: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, links: { Outfit?: string; 'Back Bling'?: string; 'Harvesting Tool'?: string; Glider?: string } = {}) => {
	const cosmetics = await fetchCosmetics();
	const noBackground = chosenBackground === null;
	if (!noBackground && !isBackground(chosenBackground)) throw new TypeError(ErrorMessages.FalseTypeguard.replace('{value}', chosenBackground));
	const rawBackground = noBackground ? randomFromArray(Object.values(BackgroundURLs)) : BackgroundURLs[chosenBackground];
	const background = await Canvas.loadImage(rawBackground);
	const canvas = Canvas.createCanvas(background.width, background.height);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	type Link = keyof typeof links;
	type Dimensions = { [K in Link]: [number, number, number, number] };

	const handleImage = async (input: StringOption, displayType: Link, displayValues: string[]) => {
		let image: Canvas.Image | null = null;
		const link = links[displayType];

		if (link !== undefined) {
			image = await Canvas.loadImage(link);
		}
		else if (input !== null) {
			const cosmetic = cosmetics.find(e => displayValues.includes(e.type.displayValue) && noPunc(e.name.toLowerCase().replace(/ /g, '')) === noPunc(input));
			if (cosmetic === undefined) {
				throw new Error(ErrorMessages.UnexpectedValue.replace('{value}', displayType));
			}
			image = await Canvas.loadImage(cosmetic.images.featured ?? cosmetic.images.icon);
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
		const oi = cosmetics.find(o => o.type.displayValue === 'Wrap' && noPunc(o.name.toLowerCase().replace(/ /g, '')) === noPunc(wrap));
		if (!oi) {
			return 'Invalid wrap name provided.';
		}
		const wrapImg = await Canvas.loadImage(oi.images.featured ?? oi.images.icon);
		ctx.drawImage(wrapImg, background.width - (background.height * wrapImg.width / wrapImg.height / 2), background.height / 2, background.height * wrapImg.width / wrapImg.height / 2, background.height / 2);
	}

	return new AttachmentBuilder(canvas.toBuffer(), { name: 'loadout.png' });
};

export const createStyleListeners = async (interaction: ChatInputCommandInteraction, attachment: AttachmentBuilder, outfit: StringOption, backbling: StringOption, harvestingtool: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, embeds: EmbedBuilder[]) => {
	const cosmetics = await fetchCosmetics();
	if (chosenBackground !== null && !isBackground(chosenBackground)) throw new TypeError(ErrorMessages.FalseTypeguard.replace('{value}', chosenBackground));

	let components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

	const handleVariants = (input: StringOption, displayValues: string[], displayType: string) => {
		if (input !== null) {
			const cosmetic = cosmetics.find(c => displayValues.includes(c.type.displayValue) && noPunc(c.name.toLowerCase().replace(/ /g, '')) === noPunc(input));
			if (cosmetic !== undefined) {
				const variants = cosmetic.variants?.[0];
				if (variants) {
					components.push(
						new ActionRowBuilder({
							components: [
								new SelectMenuBuilder()
									.setCustomId(cosmetic.id)
									.setOptions([
										{ label: `Default ${displayType}`, value: 'truedefault', default: true },
										...variants.options.map(variant => ({ label: variant.name, value: variant.tag })).slice(0, 24)
									])
									.setMinValues(1)
									.setMaxValues(1)
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
						.setCustomId('confirm')
						.setLabel('Confirm')
						.setStyle(ButtonStyle.Success)
				]
			})
		);
	}
	await interaction.editReply({ components, content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, files: [attachment], embeds });
	if (components.length > 0) {
		const message: Message = await interaction.fetchReply();
		const filter = (i: MessageComponentInteraction) => {
			if (i.user.id === interaction.user.id) return true;
			i.reply({ content: 'Only the command user can use this.', ephemeral: true });
			return false;
		};
		const collector = message.createMessageComponentCollector({ filter, time: 120000 });
		const options: { [key: string]: string } = {};

		collector.on('collect', async i => {
			if (i.customId === 'confirm') {
				await i.update({ components: [], content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, embeds });
				return;
			}
			await i.deferUpdate();

			if (!i.isSelectMenu()) throw new TypeError(ErrorMessages.FalseTypeguard.replace('{value}', i.componentType.toString()));
			const value = i.values[0];
			const cosmetic = cosmetics.find(c => c.id === i.customId);
			if (cosmetic) {
				const variants = cosmetic.variants?.[0].options;
				if (variants) {
					const imageURL = value.startsWith('truedefault')
						? cosmetic.images.featured ?? cosmetic.images.icon
						: variants.find(option => option.tag === value)?.image;

					if (imageURL === undefined) throw new Error(ErrorMessages.UnexpectedValue.replace('{value}', value));

					options[cosmetic.type.displayValue] = imageURL;
					const newAttachmentBuilder = await createLoadoutAttachment(outfit, backbling, harvestingtool, glider, wrap, chosenBackground, options);
					components = components.map(row => {
						const menu = row.components[0];
						if (menu.data.type === ComponentType.Button || (menu.data.type === ComponentType.SelectMenu && menu.data.custom_id !== cosmetic.id)) return row;

						if (menu instanceof SelectMenuBuilder) {
							menu.setOptions(value.startsWith('truedefault')
								? [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault', default: true }, ...variants.map(variant => ({ label: variant.name, value: variant.tag })).slice(0, 24)]
								: [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault' }, ...variants.map(variant => ({ label: variant.name, value: variant.tag, default: variant.tag === value })).slice(0, 24)]
							);
						}
						return row.setComponents([menu]);
					});

					await i.editReply({ attachments: [], content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, files: [newAttachmentBuilder], components, embeds });
				}
			}
		});

		collector.on('end', async (collected, reason) => {
			if (reason === 'time') await interaction.editReply({ components: [], content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, embeds });
		});
	}
};

export const grantMilestone = (userId: Snowflake, guildId: Snowflake, milestoneName: string) => memberSchema.updateOne(
	{ userId, guildId },
	{ $addToSet: { milestones: milestoneName } },
	{ upsert: true }
);