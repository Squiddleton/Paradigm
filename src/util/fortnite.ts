import { type Image, createCanvas, loadImage } from '@napi-rs/canvas';
import { type HabaneroTrackProgress } from '@squiddleton/epic';
import { type AccountType, type AnyCosmetic, type BRCosmetic, type Bundle, type EpicAccount, FortniteAPIError, type ShopEntry, type Stats } from '@squiddleton/fortnite-api';
import { formatPossessive, getRandomItem, normalize, removeDuplicates, sum } from '@squiddleton/util';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, type ColorResolvable, Colors, type CommandInteraction, ComponentType, DiscordAPIError, EmbedBuilder, type InteractionReplyOptions, type Message, type MessageActionRowComponentBuilder, MessageFlags, RESTJSONErrorCodes, StringSelectMenuBuilder, type User, type UserContextMenuCommandInteraction, bold, chatInputApplicationCommandMention, hideLinkEmbed, time, underline, userMention } from 'discord.js';
import type { DiscordClient } from './classes.js';
import { AccessibleChannelPermissions, BackgroundURL, ChapterLengths, DiscordIds, ErrorMessage, RarityColors, Time } from './constants.js';
import { createRankedImage, getLevelStats } from './epic.js';
import { createPaginationButtons, isKey, messageComponentCollectorFilter, paginate } from './functions.js';
import type { ButtonOrMenu, CosmeticDisplayType, Dimensions, DisplayUserProperties, LevelCommandOptions, Links, StatsCommandOptions, StringOption } from './types.js';
import { getUser, setEpicAccount } from './users.js';
import fortniteAPI from '../clients/fortnite.js';
import guildModel from '../models/guilds.js';
import userModel from '../models/users.js';

let cachedBRCosmetics: BRCosmetic[] = [];
let cachedCosmetics: AnyCosmetic[] = [];

export const getBRCosmetics = () => cachedBRCosmetics;
export const getCosmetics = () => cachedCosmetics;
export const fetchCosmetics = async () => {
	try {
		const cosmetics = await fortniteAPI.cosmetics({ includeGameplayTags: true, includePaths: true, includeShopHistory: true });
		const allCosmetics = await fortniteAPI.cosmetics({ includeGameplayTags: true, includePaths: true, includeShopHistory: true });

		cachedBRCosmetics = cosmetics.br;
		const unflat = Object.values(allCosmetics) as AnyCosmetic[][];
		cachedCosmetics = unflat.flat().filter(c => 'name' in c || 'title' in c);
	}
	catch (error) {
		if (!(error instanceof FortniteAPIError) || error.code !== 503) throw error;
	}
};

export const getCosmeticName = (c: AnyCosmetic): string => {
	return 'name' in c ? c.name ?? 'Unnamed Cosmetic' : 'title' in c ? c.title : c.id;
};

/**
 * Returns the cosmetics currently in the Fortnite item shop.
 *
 * @returns An array of cosmetic objects
 */
export const fetchItemShop = async (): Promise<AnyCosmetic[]> => {
	const shop = await fortniteAPI.shop();

	const withoutDupes: AnyCosmetic[] = [];
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (shop.entries === null) {
		console.log(`No shop entries were found at ${new Date()}.`);
	}
	else {
		const withDupes = shop.entries.flatMap((e): AnyCosmetic[] => {
			const cosmetics: AnyCosmetic[] = e.brItems ?? [];
			return cosmetics.concat(e.tracks ?? [], e.instruments ?? [], e.cars ?? []);
		});

		for (const item of withDupes) {
			if (!withoutDupes.some(c => c.id === item.id)) withoutDupes.push(item);
		}
	}
	return withoutDupes;
};

export const findCosmetic = async (input: string) => {
	try {
		const cosmeticById = await fortniteAPI.brCosmeticsSearch({ id: input });
		return cosmeticById;
	}
	catch {
		try {
			const cosmeticByName = await fortniteAPI.brCosmeticsSearch({ name: input });
			return cosmeticByName;
		}
		catch {
			const list = getBRCosmetics();
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
					const items = removeDuplicates(entries.filter(e => user.wishlistCosmeticIds.includes(e.id)).map(c => getCosmeticName(c)));
					if (items.length > 0) messages.push(`${userMention(user._id)}: ${items.slice(0, 10).join(', ')}${items.length > 10 ? `, and ${items.length - 10} more!` : ''}`);
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

					messages.push(`\nIf you have purchased your item, use ${chatInputApplicationCommandMention('wishlist', 'remove', DiscordIds.CommandId.Wishlist)}.\nDo you want to create your own wishlist?  Check out ${chatInputApplicationCommandMention('wishlist', 'add', DiscordIds.CommandId.Wishlist)}!`);

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
 * Creates an image of the current Fortnite item shop.
 * @param side - The length and width of each shop entry in pixels
 * @returns A buffer image displaying every relevant cosmetic in the current item shop.
 */
export const createShopImage = async (side = 256) => {
	const entriesPerRow = 8;
	const gap = side / 10;
	const headerHeight = side * 0.5;
	const footerHeight = side * 0.75;

	const shop = await fortniteAPI.shop();
	const entries = shop.entries.filter(e => 'newDisplayAsset' in e && e.newDisplayAsset.renderImages?.length && (e.brItems !== undefined || e.cars !== undefined));
	entries.sort((a, b) => {
		const regex = /\d*\.\d+/;
		if (a.layout.rank !== b.layout.rank) return b.layout.rank - a.layout.rank;
		if (a.layoutId !== b.layoutId) {
			let aLayout = regex.exec(a.layoutId)?.[0];
			let bLayout = regex.exec(b.layoutId)?.[0];
			if (aLayout === undefined || bLayout === undefined)
				return 0;

			if (aLayout.startsWith('.'))
				aLayout = `0${aLayout}`;
			if (bLayout.startsWith('.'))
				bLayout = `0${bLayout}`;
			const aInt = parseInt(aLayout);
			const bInt = parseInt(bLayout);

			if (aInt === bInt) return Number.parseFloat(bLayout) - Number.parseFloat(aLayout);
			return bInt - aInt;
		}
		return b.sortPriority - a.sortPriority;
	});

	const entryCount = entries.length;
	const totalWidth = entriesPerRow * (side + gap) + gap;
	const totalRows = Math.ceil(entryCount / entriesPerRow);
	const totalHeight = headerHeight + totalRows * (side + gap) + gap + footerHeight;

	const itemToCanvas = async (entry: ShopEntry) => {
		const canvas = createCanvas(side, side);
		const ctx = canvas.getContext('2d');

		const getFillStyle = (color: string) => `#${color.slice(0, -2)}`;

		// Background gradient
		const gradient = ctx.createLinearGradient(side / 2, 0, side / 2, side);
		gradient.addColorStop(0, getFillStyle(entry.colors.color1));
		if (entry.colors.color2) {
			gradient.addColorStop(0.5, getFillStyle(entry.colors.color3));
			gradient.addColorStop(1, getFillStyle(entry.colors.color2));
		}
		else {
			gradient.addColorStop(1, getFillStyle(entry.colors.color3));
		}
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, side, side);

		// Item image
		const imageURL = entry.newDisplayAsset.renderImages?.[0].image;
		if (imageURL !== undefined) {
			const image = await loadImage(imageURL);
			ctx.drawImage(image, 0, 0, side, side);
		}

		// Text background
		const textBackgroundHeight = side * 0.275;
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(0, side - textBackgroundHeight, side, textBackgroundHeight);

		// Price V-Buck icon
		const vb = await loadImage('https://fortnite-api.com/images/vbuck.png');
		ctx.drawImage(vb, side * 0.09, side * 0.865, side / 10, side / 10);

		// Price
		ctx.font = `${side / 10}px fortnite`;
		ctx.fillStyle = 'white';
		ctx.textAlign = 'left';
		ctx.fillText(`${entry.regularPrice}`, side * 0.2, side * 0.95, side / 2);

		ctx.textAlign = 'center';

		// Out date
		ctx.fillText(`Exits ${new Date(entry.outDate).toLocaleDateString('en-us', { month: 'short', day: 'numeric' })}`, side * 0.7, side * 0.95, side / 2);

		// Name
		ctx.font = `${side / 8}px fortnite`;
		const bundle = entry.bundle as Bundle | undefined;
		ctx.fillText(bundle !== undefined ? bundle.name : (entry.brItems?.[0].name ?? entry.layout.name), side / 2, side * 0.84, side * 0.97);

		// Banner
		if ('banner' in entry) {
			ctx.textAlign = 'left';
			ctx.font = `${side / 10}px fortnite`;

			const bannerBackgroundXOffset = side * 0.02;
			const bannerBackgroundYOffset = side * 0.6;
			const textYOffset = bannerBackgroundYOffset * 1.14;
			const text = entry.banner.value;

			const borderRadius = side * 0.05;
			const maxTextWidth = side - 2 * (borderRadius + bannerBackgroundXOffset);
			const textWidth = Math.min(ctx.measureText(text).width, maxTextWidth);
			const bannerBackgroundWidth = textWidth + (borderRadius * 2);
			const bannerBackgroundHeight = side * 0.1;

			ctx.fillStyle = 'yellow';
			ctx.beginPath();
			ctx.roundRect(bannerBackgroundXOffset, bannerBackgroundYOffset, bannerBackgroundWidth, bannerBackgroundHeight, [borderRadius]);
			ctx.fill();

			ctx.fillStyle = 'black';
			ctx.fillText(text, bannerBackgroundXOffset + borderRadius, textYOffset, maxTextWidth);
		}

		const margin = side * 0.02;
		const canvasWithMargin = createCanvas(canvas.width, canvas.height);
		const ctxWithMargin = canvasWithMargin.getContext('2d');
		ctxWithMargin.fillStyle = getFillStyle(entry.colors.textBackgroundColor);
		ctxWithMargin.fillRect(0, 0, side, side);
		ctxWithMargin.drawImage(canvas, margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);

		return canvasWithMargin;
	};

	const canvas = createCanvas(totalWidth, totalHeight);
	const ctx = canvas.getContext('2d');

	const gradient = ctx.createLinearGradient(totalWidth / 2, 0, totalWidth / 2, totalHeight);
	gradient.addColorStop(0, 'midnightblue');
	gradient.addColorStop(0.5, 'rgb(11, 155, 210)');
	gradient.addColorStop(1, 'midnightblue');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, totalWidth, totalHeight);

	ctx.font = `${side / 5}px fortnite`;
	ctx.fillStyle = 'white';
	ctx.textAlign = 'center';
	ctx.fillText(`Fortnite Item Shop: ${new Date(shop.date).toLocaleDateString('en-us', { month: 'long', day: 'numeric', year: 'numeric' })}`, totalWidth / 2, side / 4);
	ctx.fillText('discord.gg/fortnitebr', totalWidth / 3, side / 2);
	ctx.fillText('squiddleton.dev/paradigm/invite', totalWidth * 2 / 3, side / 2);
	ctx.fillText('Want a notification when an item appears in the item shop? Add the app The Paradigm, and use "/wishlist add"!', totalWidth / 2, totalHeight - (footerHeight * 0.75));
	ctx.fillText('Want automatic item shop posts in your own server? Add the bot and use "/settings edit"!', totalWidth / 2, totalHeight - (footerHeight * 0.25));

	for (let i = 0; i < entries.length; i++) {
		const item = entries[i];
		const row = Math.floor(i / entriesPerRow);
		const dy = gap + row * (gap + side) + headerHeight;
		const col = i % entriesPerRow;
		const dx = gap + col * (gap + side);

		const itemCanvas = await itemToCanvas(item);
		ctx.drawImage(itemCanvas, dx, dy, side, side);
	}

	return canvas.encode('png');
};

/**
 * Returns a cosmetic's color.
 *
 * @param cosmetic - A cosmetic object
 * @returns A discord.js color resolvable, or null if the cosmetic has no series or its rarity is absent from the RarityColors enum
 */
export const getCosmeticColor = (cosmetic: AnyCosmetic): ColorResolvable | null => {
	const seriesColor = 'series' in cosmetic ? cosmetic.series?.colors[0].slice(0, 6) : undefined;
	return seriesColor === undefined
		? 'rarity' in cosmetic ? RarityColors[cosmetic.rarity.displayValue] ?? null : null
		: `#${seriesColor}`;
};

export const getCosmeticSmallIcon = (cosmetic: AnyCosmetic): string | null => 'images' in cosmetic ? ('smallIcon' in cosmetic.images ? cosmetic.images.smallIcon ?? null : 'small' in cosmetic.images ? cosmetic.images.small : cosmetic.images.icon ?? null) : cosmetic.albumArt;

export const getCosmeticLargeIcon = (cosmetic: AnyCosmetic): string | null => 'images' in cosmetic ? ('featured' in cosmetic.images ? cosmetic.images.featured ?? cosmetic.images.icon ?? null : 'large' in cosmetic.images ? cosmetic.images.large : getCosmeticSmallIcon(cosmetic)) : cosmetic.albumArt;

/**
 * Returns an embed describing a cosmetic.
 *
 * @param cosmetic - A cosmetic object
 * @returns An embed filled with information about the specified cosmetic
 */
export const createCosmeticEmbed = (cosmetic: AnyCosmetic) => {
	const embed = new EmbedBuilder()
		.setTitle(getCosmeticName(cosmetic))
		.setDescription('description' in cosmetic ? cosmetic.description : 'artist' in cosmetic ? cosmetic.artist : null)
		.setColor(getCosmeticColor(cosmetic))
		.setThumbnail(getCosmeticSmallIcon(cosmetic))
		.setImage(getCosmeticLargeIcon(cosmetic))
		.setFields([
			{ name: 'Type', value: 'type' in cosmetic ? cosmetic.type.displayValue : 'Jam Track', inline: true },
			{ name: 'Rarity', value: 'rarity' in cosmetic ? cosmetic.rarity.displayValue : 'None', inline: true },
			{ name: 'Set', value: 'set' in cosmetic ? (cosmetic.set?.value ?? 'None') : 'None', inline: true },
			{ name: 'Introduction', value: 'introduction' in cosmetic ? (cosmetic.introduction === undefined ? 'N/A' : `Chapter ${cosmetic.introduction.chapter}, Season ${cosmetic.introduction.season}`) : 'N/A', inline: true }
		]);
	// .setFooter({ text: cosmetic.id }); TODO: Un-comment when Discord fixes embed formatting issues
	if ('shopHistory' in cosmetic && cosmetic.shopHistory !== undefined) {
		const debut = cosmetic.shopHistory[0];
		embed.addFields({ name: 'Shop History', value: `First: ${time(new Date(debut))}\nLast: ${time(new Date(cosmetic.shopHistory.at(-1) ?? debut))}\nTotal: ${cosmetic.shopHistory.length}`, inline: true });
	}
	if ('gameplayTags' in cosmetic && cosmetic.gameplayTags?.includes('Cosmetics.Gating.RatingMin.Teen')) embed.setFooter({ text: 'You cannot use this item in experiences rated Everyone 10+ or lower.' });
	if ('customExclusiveCallout' in cosmetic && cosmetic.customExclusiveCallout !== undefined) embed.addFields({ name: 'Exclusive', value: cosmetic.customExclusiveCallout, inline: true });
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
	const cosmetics = getBRCosmetics();
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
	const handleImage = async (input: StringOption, types: string[], displayType: CosmeticDisplayType) => {
		let image: Image | null = null;
		const link = links[displayType];

		if (link !== undefined) {
			image = await loadImage(link);
		}
		else if (input !== null) {
			const cosmetic = cosmetics.find(c => types.includes(c.type.value) && normalize(c.name.toLowerCase().replace(/ /g, '')) === normalize(input));
			if (cosmetic === undefined) return `No ${displayType} matches your query.`;

			const icon = cosmetic.images.featured ?? cosmetic.images.icon ?? cosmetic.images.smallIcon;
			if (icon === undefined) return `Your ${displayType} has no image; please try a different one!`;
			image = await loadImage(icon);
		}

		if (image !== null) {
			const dimensions: Dimensions = {
				'Outfit': [
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
				'Pickaxe': [
					0,
					background.height / 2,
					background.height * image.width / image.height / 2,
					background.height / 2
				],
				'Glider': [
					background.width - (background.height * image.width / image.height / 2),
					0,
					background.height * image.width / image.height / 2,
					background.height / 2
				],
				'Wrap': [
					background.width - (background.height * image.width / image.height / 2),
					background.height / 2,
					background.height * image.width / image.height / 2,
					background.height / 2
				]
			};
			ctx.drawImage(image, ...dimensions[displayType]);
		}
	};

	const args: [StringOption, string[], CosmeticDisplayType][] = [
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

	return new AttachmentBuilder(await canvas.encode('png'), { name: 'loadout.png' });
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
export const createStyleListeners = async (interaction: ChatInputCommandInteraction, attachment: AttachmentBuilder, outfit: StringOption, backbling: StringOption, pickaxe: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, embeds: EmbedBuilder[] = []) => {
	const cosmetics = getBRCosmetics();
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
										...variants.options.map(o => ({ label: o.name ?? 'Unknown', value: o.tag })).slice(0, 24)
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
	variantArgs.forEach(arg => {
		handleVariants(...arg);
	});

	if (components.length > 0) {
		components.push(
			new ActionRowBuilder({
				components: [
					new ButtonBuilder()
						.setCustomId('lock')
						.setLabel('Lock Image In')
						.setStyle(ButtonStyle.Primary)
				]
			})
		);
	}

	const content = embeds.length > 0 ? hideLinkEmbed('https://twitter.com/FortniteGame/status/1068655953699053568') : null;

	let message: Message;
	try {
		message = await interaction.editReply({ components, content, files: [attachment], embeds });
	}
	catch (error) {
		if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.UnknownMessage) throw error;
		return;
	}
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
							? cosmetic.images.featured ?? cosmetic.images.icon ?? cosmetic.images.smallIcon
							: variants.find(v => v.tag === value)?.image;

						if (typeof imageURL !== 'string') throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', value));

						options[cosmetic.type.displayValue] = imageURL;

						const newAttachmentBuilder = await createLoadoutAttachment(outfit, backbling, pickaxe, glider, wrap, chosenBackground, options);
						components = components.map(c => {
							const [menu] = c.components;
							const menuJSON = menu.toJSON();
							if (menuJSON.type === ComponentType.Button || (menuJSON.type === ComponentType.StringSelect && menuJSON.custom_id !== cosmetic.id)) return c;

							if (menu instanceof StringSelectMenuBuilder) {
								menu.setOptions(value.startsWith('truedefault')
									? [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault', default: true }, ...variants.map(v => ({ label: v.name ?? 'Unknown', value: v.tag })).slice(0, 24)]
									: [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault' }, ...variants.map(v => ({ label: v.name ?? 'Unknown', value: v.tag, default: v.tag === value })).slice(0, 24)]
								);
							}
							return c.setComponents([menu]);
						});

						await i.editReply({ attachments: [], content, files: [newAttachmentBuilder], components, embeds });
					}
				}
			})
			.once('end', async (collected, reason) => {
				if (reason === 'time') {
					try {
						await interaction.editReply({ components: [] });
					}
					catch (error) {
						const errorCodes: (string | number)[] = [RESTJSONErrorCodes.InvalidWebhookToken, RESTJSONErrorCodes.UnknownMessage];
						if (!(error instanceof DiscordAPIError) || !errorCodes.includes(error.code)) throw error;
					}
				}
			});
	}
};

/**
 * Returns a string representative of an error thrown from fetching a user's levels.
 *
 * @param e - The thrown error
 * @returns A string explaining the error to the command user
 */
const getStatsErrorMessage = (e: unknown, accountType: AccountType) => {
	if (e instanceof FortniteAPIError) {
		switch (e.code) {
			case 403: {
				return 'This account\'s stats are private. If this is your account, go into Fortnite => Settings => Account and Privacy => Public Game Stats => On.';
			}
			case 404: {
				const accountTypeNames: Record<AccountType, string> = {
					epic: 'Epic Games',
					xbl: 'Xbox',
					psn: 'PlayStation'
				};
				return `No ${accountTypeNames[accountType]} account with that username exists.`;
			}
			case 500: {
				return 'Fortnite-API was unable to fetch the account info. Please try again in a few minutes.';
			}
			case 503: {
				return 'Fortnite-API is currently booting up. Please try again in a few minutes.';
			}
		}
	}
	console.error(e);
	return 'There was an error while fetching the account.';
};

/**
 * Returns the content for a message containing a user's final level in each Fortnite season.
 *
 * @param options - Options specifying the Discord user and their Epic Games account
 * @returns Options for replying to an interaction and, if found, the user's Epic Games account
 */
export const getLevelsString = async (options: LevelCommandOptions): Promise<InteractionReplyOptions & { account?: EpicAccount }> => {
	const { accountName, accountType, targetUser } = options;

	/**
	 * Returns a string including each Fortnite season and the user's respective level.
	 *
	 * @param levels - An object with keys of the seasons and values of the user's level in the season
	 * @param name - The user's Epic Games account username
	 * @returns A string with a header including the user's Epic Games username and a body of the user's levels in each season
	 */
	const formatLevels = (levels: Partial<Record<string, number>>) => `${bold('Battle Pass Levels')}\n${Object
		.entries(levels)
		.sort()
		.map(([k, v]) => {
			const match = /\d+/.exec(k);
			if (match === null) return 'null';
			const overallSeason = parseInt(match[0]);
			const index = ChapterLengths.findIndex((length, i) => overallSeason <= ChapterLengths.slice(0, i + 1).reduce(sum));
			const chapterIndex = index === -1 ? ChapterLengths.length : index;
			const chapterName = [
				'1',
				'2',
				'3',
				'4',
				'Fortnite: OG',
				'5',
				'Fortnite: Remix',
				'6'
			][chapterIndex];
			const seasonName = chapterName.startsWith('Fortnite') ? chapterName : overallSeason - ChapterLengths.slice(0, chapterIndex).reduce(sum);
			return `Chapter ${chapterName}, Season ${seasonName}: ${Math.floor((v ?? 0) / 100)}`;
		})
		.join('\n')}`;

	if (accountName === null) {
		const userResult = getUser(targetUser.id);
		if (!userResult?.epicAccountId) {
			return { content: `No player username was provided, and you have not yet linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`, flags: MessageFlags.Ephemeral };
		}

		try {
			const stats = await getLevelStats(userResult.epicAccountId);
			if (typeof stats === 'string') return { content: stats };
			return { content: formatLevels(stats) };
		}
		catch (error) {
			return { content: getStatsErrorMessage(error, accountType), flags: MessageFlags.Ephemeral };
		}
	}
	else {
		try {
			const { account } = await fortniteAPI.stats({ name: accountName, accountType });
			const stats = await getLevelStats(account.id);
			if (typeof stats === 'string') return { content: stats };
			return { content: formatLevels(stats), account };
		}
		catch (error) {
			return { content: getStatsErrorMessage(error, accountType), flags: MessageFlags.Ephemeral };
		}
	}
};

export const getStats = async (interaction: ChatInputCommandInteraction, accountName: string | null, accountType: AccountType, user: User | null): Promise<Stats<false> | null> => {
	if (accountName !== null) {
		try {
			const stats = await fortniteAPI.stats({ name: accountName, accountType });
			return stats;
		}
		catch (error) {
			await handleStatsError(interaction, error, accountType);
			return null;
		}
	}
	else {
		const userResult = getUser(user?.id ?? interaction.user.id);
		if (!userResult?.epicAccountId) {
			if (user === null) {
				await interaction.editReply(`No player username was provided, and you have not yet linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
			}
			else {
				await interaction.editReply(`${user.displayName} has not yet linked their account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
			}
			return null;
		}
		try {
			const stats = await fortniteAPI.stats({ id: userResult.epicAccountId });
			return stats;
		}
		catch (error) {
			await handleStatsError(interaction, error);
			return null;
		}
	}
};

/**
 * Replies to an interaction with an error message thrown from fetching a user's stats.
 *
 *
 * @param interaction - The command interaction that initiated this function call
 * @param e - The thrown error
 */
export const handleStatsError = (interaction: CommandInteraction, e: unknown, accountType: AccountType = 'epic') => interaction[interaction.deferred || interaction.replied ? 'followUp' : 'reply'](getStatsErrorMessage(e, accountType));

export const isUnknownRank = (progress: HabaneroTrackProgress) => progress.currentDivision === 0 && progress.promotionProgress === 0 && new Date(progress.lastUpdated).getTime() === 0;

/**
 * Links a Discord user's account to an Epic Games account.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param account - An Epic Games account object
 * @param ephemeral - Whether the response should only be visible to the user
 */
export const linkEpicAccount = async (interaction: ChatInputCommandInteraction, account: EpicAccount, ephemeral = false) => {
	const userId = interaction.user.id;
	const userDocument = getUser(userId);

	if (account.id === userDocument?.epicAccountId) {
		await interaction.followUp({ content: 'You have already linked that Epic account with this bot.', flags: MessageFlags.Ephemeral });
	}
	else {
		await setEpicAccount(userId, account.id);
		await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
	}
};

/**
 * Posts images of the item shop to all servers with a channel subscribed for them.
 * @param client - A ready Discord client
 */
export const postShopImages = async (client: DiscordClient<true>) => {
	const guildDocuments = await guildModel.find({ shopChannelId: { $ne: null } });
	if (guildDocuments.length === 0)
		return;

	const shopImage = await createShopImage();

	for (const guildDocument of guildDocuments) {
		if (guildDocument.shopChannelId === null)
			continue;

		try {
			const channel = client.getVisibleChannel(guildDocument.shopChannelId);
			await channel.send({ files: [shopImage] });
		}
		catch (e) {
			console.error('An error has occured while posting shop image', e, guildDocument);
		}
	}
};

/**
 * Replies to an interaction with an image of a user's Fortnite stats.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param options - Options for getting the user's Epic Games account
 * @param content - A message to send alongside the stats image
 */
export const sendStatsImages = async (interaction: CommandInteraction, options: StatsCommandOptions) => {
	const isContextMenu = interaction.isContextMenuCommand();
	await interaction.deferReply({ flags: isContextMenu ? MessageFlags.Ephemeral : undefined });

	if (options.accountName === null) {
		const userResult = getUser(options.targetUser.id);
		if (!userResult?.epicAccountId) {
			if (interaction.user.id !== options.targetUser.id) await interaction.editReply(`${options.targetUser.displayName} has not yet linked their Epic account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
			else await interaction.editReply(`No player username was provided, and you have not yet linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
		}
		else {
			try {
				const { account, image } = await fortniteAPI.stats({ id: userResult.epicAccountId, image: options.input, timeWindow: options.timeWindow });
				await interaction.editReply({ content: options.content, files: [image] });
				const buffer = await createRankedImage(account, isContextMenu, 'br');
				if (buffer !== 'Unknown') {
					if (buffer === null) await interaction.followUp({ flags: isContextMenu ? MessageFlags.Ephemeral : undefined, content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
					else await interaction.followUp({ flags: isContextMenu ? MessageFlags.Ephemeral : undefined, files: [buffer] });
				}
			}
			catch (error) {
				await handleStatsError(interaction, error);
			}
		}
	}
	else {
		try {
			const { account, image } = await fortniteAPI.stats({ name: options.accountName, accountType: options.accountType, image: options.input, timeWindow: options.timeWindow });
			await interaction.editReply({ files: [image] });
			const buffer = await createRankedImage(account, isContextMenu, 'br');
			if (buffer !== 'Unknown') {
				if (buffer === null) await interaction.followUp({ flags: isContextMenu ? MessageFlags.Ephemeral : undefined, content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
				else await interaction.followUp({ flags: isContextMenu ? MessageFlags.Ephemeral : undefined, files: [buffer] });
			}

			if (interaction.isChatInputCommand() && interaction.options.getBoolean('link')) await linkEpicAccount(interaction, account, true);
		}
		catch (error) {
			await handleStatsError(interaction, error, options.accountType);
		}
	}
};

/**
 * Replies to an interaction with a user's wishlisted items
 *
 * @param interaction - The command interaction that initiated this function call
 */
export const viewWishlist = async (interaction: UserContextMenuCommandInteraction | ChatInputCommandInteraction) => {
	/**
	 * Returns properties of a user or member used in a wishlist embed.
	 *
	 * @returns An object containing properties like a color and avatar URL
	 */
	const getUserProperties = async (): Promise<DisplayUserProperties> => {
		const unfetchedUser = interaction.options.getUser('user') ?? interaction.user;
		// Users must be force-fetched to retrieve banners
		const user = await unfetchedUser.fetch();
		const userId = user.id;
		const isSameUser = interaction.user.id === user.id;
		const userData = {
			id: userId,
			name: user.displayName,
			color: user.accentColor ?? Colors.Purple,
			avatar: user.displayAvatarURL(),
			same: isSameUser
		};

		// Return global user data if the interaction was received in DMs
		if (!interaction.inCachedGuild()) return userData;

		if (isSameUser) {
			return {
				id: userId,
				name: interaction.member.displayName,
				color: interaction.member.displayColor,
				avatar: interaction.member.displayAvatarURL(),
				same: true
			};
		}

		const mentionedMember = interaction.options.getMember('user');
		if (mentionedMember === null) return userData;

		return {
			id: userId,
			name: mentionedMember.displayName,
			color: mentionedMember.displayColor,
			avatar: mentionedMember.displayAvatarURL(),
			same: false
		};
	};

	const user = await getUserProperties();
	const userResult = getUser(user.id);
	if (!userResult?.wishlistCosmeticIds.length) {
		await interaction.editReply({ content: `${user.same ? 'Your' : formatPossessive(user.name)} wishlist is currently empty.` });
		return;
	}

	const cosmetics = getCosmetics();
	const inc = 25;
	const cosmeticStrings = userResult.wishlistCosmeticIds
		.map(id => {
			const cosmetic = cosmetics.find(c => c.id === id);
			if (cosmetic === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', id));
			const type = 'type' in cosmetic ? cosmetic.type.displayValue : 'Jam Track';
			return `${getCosmeticName(cosmetic)}${type === 'Outfit' ? '' : ` (${type})`}`;
		})
		.sort((a, b) => a.localeCompare(b));

	const embed = new EmbedBuilder()
		.setColor(user.color)
		.setDescription(`${underline(`Cosmetics (${cosmeticStrings.length}):`)}\n${cosmeticStrings.slice(0, inc).join('\n')}`)
		.setThumbnail(user.avatar)
		.setTitle(`${formatPossessive(user.name)} Wishlist`);

	const willUseButtons = cosmeticStrings.length > inc;
	const buttons = createPaginationButtons();

	const message = await interaction.editReply({
		components: willUseButtons ? [new ActionRowBuilder<ButtonBuilder>({ components: buttons })] : [],
		embeds: [embed]
	});

	if (willUseButtons) paginate(interaction, message, embed, buttons, 'Cosmetics', cosmeticStrings, inc);
};