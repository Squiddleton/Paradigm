import { GlobalFonts, type Image, createCanvas, loadImage } from '@napi-rs/canvas';
import { type HabaneroTrackProgress, type TimelineChannelData, type TimelineClientEventsState } from '@squiddleton/epic';
import { type AccountType, type AnyCosmetic, type BRCosmetic, type EpicAccount, FortniteAPIError, type Stats } from '@squiddleton/fortnite-api';
import { formatPossessive, getRandomItem, normalize, quantify, removeDuplicates, sum } from '@squiddleton/util';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, type ColorResolvable, Colors, type CommandInteraction, ComponentType, DiscordAPIError, EmbedBuilder, type InteractionReplyOptions, type Message, type MessageActionRowComponentBuilder, PermissionFlagsBits, RESTJSONErrorCodes, StringSelectMenuBuilder, type User, type UserContextMenuCommandInteraction, bold, chatInputApplicationCommandMention, codeBlock, hideLinkEmbed, time, underline, userMention } from 'discord.js';
import type { DiscordClient } from './classes.js';
import { AccessibleChannelPermissions, BackgroundURL, ChapterLengths, DiscordIds, divisionNames, EpicEndpoint, ErrorMessage, RankedTrack, RarityColors, Time } from './constants.js';
import { getLevelStats, getTrackProgress } from './epic.js';
import { createPaginationButtons, isKey, messageComponentCollectorFilter, paginate } from './functions.js';
import type { ButtonOrMenu, CosmeticDisplayType, Dimensions, DisplayUserProperties, FortniteWebsite, LevelCommandOptions, Links, StatsCommandOptions, StringOption } from './types.js';
import { getUser, setEpicAccount } from './users.js';
import epicClient from '../clients/epic.js';
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
		const withDupes = shop.entries.map((e): AnyCosmetic[] => {
			const cosmetics: AnyCosmetic[] = e.brItems ?? [];
			return cosmetics.concat(e.tracks ?? [], e.instruments ?? [], e.cars ?? []);
		}).flat();

		for (const item of withDupes) {
			if (!withoutDupes.some(c => c.id === item.id)) withoutDupes.push(item);
		}
	}
	return withoutDupes;
};

/**
 * Returns the names of the shop tabs in a client event state.
 *
 * @param state - The client event state from Epic Games' timeline API
 * @returns An array of shop tab names
 */
export const fetchShopNames = async (state: TimelineChannelData<TimelineClientEventsState>) => {
	const fortniteWebsite = await fetch(EpicEndpoint.Website).then(res => res.json()) as FortniteWebsite;
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
export const fetchStates = () => epicClient.fortnite.getTimeline().then(timeline => timeline.channels['client-events'].states);

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
			const match = k.match(/\d+/);
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
				'5'
			][chapterIndex];
			const seasonName = chapterName === 'Fortnite: OG' ? chapterName : overallSeason - ChapterLengths.slice(0, chapterIndex).reduce(sum);
			return `Chapter ${chapterName}, Season ${seasonName}: ${Math.floor((v ?? 0) / 100)}`;
		})
		.join('\n')}`;

	if (accountName === null) {
		const userResult = getUser(targetUser.id);
		if (!userResult?.epicAccountId) {
			return { content: `No player username was provided, and you have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`, ephemeral: true };
		}

		try {
			const stats = await getLevelStats(userResult.epicAccountId);
			if (typeof stats === 'string') return { content: stats };
			return { content: formatLevels(stats) };
		}
		catch (error) {
			return { content: getStatsErrorMessage(error, accountType), ephemeral: true };
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
			return { content: getStatsErrorMessage(error, accountType), ephemeral: true };
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
				await interaction.editReply(`No player username was provided, and you have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
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
		await interaction.followUp({ content: 'You have already linked that Epic account with this bot.', ephemeral: true });
	}
	else {
		await setEpicAccount(userId, account.id);
		await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, ephemeral });
	}
};

export function createRankedImage(account: EpicAccount, returnUnknown: true, rankingType: 'br' | 'rr', season?: string): Promise<Buffer | null>;
export function createRankedImage(account: EpicAccount, returnUnknown: boolean, rankingType: 'br' | 'rr', season?: string): Promise<Buffer | null | 'Unknown'>;
export async function createRankedImage(account: EpicAccount, returnUnknown: boolean, rankingType: 'br' | 'rr', season?: string) {
	const trackProgress = await getTrackProgress(account.id);
	if (trackProgress === null) return null;

	const getTrack = (trackguid: RankedTrack) => {
		const track = trackProgress.find(t => t.trackguid === trackguid);
		if (track === undefined) throw new Error(`No track was found for guid ${trackguid}`);
		return track;
	};

	let seasonName = 'Chapter 5 Season 4';
	let brTrackguid = RankedTrack.C5S4BR;
	let zbTrackguid = RankedTrack.C5S4ZB;
	let racingTrackguid = RankedTrack.C5S4Racing;
	let backgroundPath = 'general.jpg';
	switch (season) {
		case 'reload1': {
			seasonName = 'Reload';
			brTrackguid = RankedTrack.Reload1BR;
			zbTrackguid = RankedTrack.Reload1ZB;
			backgroundPath = 'og.jpg';
			break;
		}
		case 'c5s3': {
			seasonName = 'Chapter 5 Season 3';
			brTrackguid = RankedTrack.C5S3BR;
			zbTrackguid = RankedTrack.C5S3ZB;
			racingTrackguid = RankedTrack.InfernoIslandRacing;
			backgroundPath = 'c5s3.jpg';
			break;
		}
		case 'c5s2': {
			seasonName = 'Chapter 5 Season 2';
			brTrackguid = RankedTrack.C5S2BR;
			zbTrackguid = RankedTrack.C5S2ZB;
			backgroundPath = 'c5s2.png';
			break;
		}
		case 'c5s1': {
			seasonName = 'Chapter 5 Season 1';
			brTrackguid = RankedTrack.C5S1BR;
			zbTrackguid = RankedTrack.C5S1ZB;
			backgroundPath = 'c5s1.jpg';
			break;
		}
		case 'og': {
			seasonName = 'Fortnite: OG';
			brTrackguid = RankedTrack.OGBR;
			zbTrackguid = RankedTrack.OGZB;
			backgroundPath = 'og.jpg';
			break;
		}
		case 'c4s4': {
			seasonName = 'Chapter 4 Season 4';
			brTrackguid = RankedTrack.C4S4BR;
			zbTrackguid = RankedTrack.C4S4ZB;
			backgroundPath = 'c4s4.png';
			break;
		}
		case 'zero': {
			seasonName = 'Season Zero';
			brTrackguid = RankedTrack.S0BR;
			zbTrackguid = RankedTrack.S0ZB;
			backgroundPath = 'c4s3.png';
			break;
		}
		case 'zeroprereset': {
			seasonName = 'Season Zero (Pre-Reset)';
			brTrackguid = RankedTrack.S0PBR;
			zbTrackguid = RankedTrack.S0PZB;
			backgroundPath = 'c4s3.png';
		}
	}
	const brTrack = getTrack(brTrackguid);
	const zbTrack = getTrack(zbTrackguid);
	const racingTrack = getTrack(racingTrackguid);

	if (!returnUnknown && brTrack.currentDivision === 0 && brTrack.promotionProgress === 0 && zbTrack.currentDivision === 0 && zbTrack.promotionProgress === 0) return 'Unknown';

	const background = await loadImage(`./assets/backgrounds/${backgroundPath}`);
	const { height, width } = background;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.drawImage(background, 0, 0);

	GlobalFonts.registerFromPath('./fonts/fortnite.otf', 'fortnite');
	GlobalFonts.registerFromPath('./fonts/jetbrains-mono.ttf', 'jetbrains');
	const fontSize = height / 8;

	ctx.font = `${fontSize}px fortnite, jetbrains`;
	ctx.textAlign = 'center';
	ctx.fillStyle = backgroundPath === 'og.jpg' ? 'black' : 'white';

	ctx.fillText(`${seasonName === 'Reload' ? 'Ranked Reload' : `${seasonName} Ranked`}: ${account.name}`, width / 2, fontSize, width);

	ctx.font = `${fontSize / 2}px fortnite, jetbrains`;
	if (rankingType === 'rr') {
		ctx.fillText('Rocket Racing', width * 0.5, height - (fontSize / 4), width / 2);
	}
	else {
		ctx.fillText('Battle Royale', width * 0.25, height - (fontSize / 4), width / 2);
		ctx.fillText('Zero Build', width * 0.75, height - (fontSize / 4), width / 2);
	}

	const drawRankedImage = async (xOffset: number, track: HabaneroTrackProgress) => {
		const start = 1.5 * Math.PI;
		const end = (2 * Math.PI * track.promotionProgress) - (0.5 * Math.PI);

		const vertexX = xOffset + (width / 4);
		const vertexY = height / 2;
		const radius = height * 0.3;

		const iconWidth = width / 5;

		ctx.lineWidth = height / 36;

		const isUnknown = track.currentDivision === 0 && track.promotionProgress === 0 && new Date(track.lastUpdated).getTime() === 0;
		const divisionIconName = isUnknown
			? 'unknown'
			: divisionNames[track.currentDivision].toLowerCase().replace(' ', '');

		if (track.currentPlayerRanking === null) {
			ctx.beginPath();
			ctx.arc(vertexX, vertexY, radius * 0.85, 0, 2 * Math.PI);
			ctx.fillStyle = 'midnightblue';
			ctx.fill();

			ctx.beginPath();
			ctx.arc(vertexX, vertexY, radius, 0, 2 * Math.PI);
			ctx.strokeStyle = 'midnightblue';
			ctx.stroke();

			let progressColor = 'midnightblue';
			switch (true) {
				case divisionIconName.startsWith('bronze'): {
					progressColor = 'peru';
					break;
				}
				case divisionIconName.startsWith('silver'): {
					progressColor = 'silver';
					break;
				}
				case divisionIconName.startsWith('gold'): {
					progressColor = 'gold';
					break;
				}
				case divisionIconName.startsWith('platinum'): {
					progressColor = 'lightsteelblue';
					break;
				}
				case divisionIconName.startsWith('diamond'): {
					progressColor = 'cornflowerblue';
					break;
				}
				case divisionIconName.startsWith('elite'): {
					progressColor = 'lightslategray';
					break;
				}
				case divisionIconName.startsWith('champion'): {
					progressColor = 'firebrick';
					break;
				}
			}

			ctx.beginPath();
			ctx.arc(vertexX, vertexY, radius, start, end);
			ctx.strokeStyle = progressColor;
			ctx.stroke();
		}

		const divisionIcon = await loadImage(`./assets/ranked/${divisionIconName}.png`);
		if (divisionIconName === 'unreal') ctx.drawImage(divisionIcon, (width * 0.1) + xOffset, height / 4.5, iconWidth * 1.5, iconWidth * 1.5);
		else ctx.drawImage(divisionIcon, width * 0.15 + xOffset, height * 0.3, iconWidth, iconWidth);

		ctx.font = `${fontSize * 0.5}px fortnite, jetbrains`;
		ctx.fillStyle = backgroundPath === 'og.jpg' ? 'purple' : 'yellow';
		const divisionName = isUnknown ? 'Unknown' : divisionNames[track.currentDivision];
		const text = divisionName === 'Unknown' ? divisionName : `${divisionName} ${track.currentPlayerRanking === null ? `${Math.floor(track.promotionProgress * 100)}%` : `#${track.currentPlayerRanking}`}`;
		ctx.fillText(text, xOffset + (width / 4), height * 0.9, width / 2);
	};

	if (rankingType === 'rr') {
		await drawRankedImage(width * 0.25, racingTrack);
	}
	else {
		await drawRankedImage(0, brTrack);
		await drawRankedImage(width * 0.5, zbTrack);
	}

	const buffer = await canvas.encode('jpeg');
	return buffer;
}

/**
 * Replies to an interaction with an image of a user's Fortnite stats.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param options - Options for getting the user's Epic Games account
 * @param content - A message to send alongside the stats image
 */
export const sendStatsImages = async (interaction: CommandInteraction, options: StatsCommandOptions) => {
	const isContextMenu = interaction.isContextMenuCommand();
	await interaction.deferReply({ ephemeral: isContextMenu });

	if (options.accountName === null) {
		const userResult = getUser(options.targetUser.id);
		if (!userResult?.epicAccountId) {
			if (interaction.user.id !== options.targetUser.id) await interaction.editReply(`${options.targetUser.displayName} has not yet linked their Epic account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
			else await interaction.editReply(`No player username was provided, and you have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
		}
		else {
			try {
				const { account, image } = await fortniteAPI.stats({ id: userResult.epicAccountId, image: options.input, timeWindow: options.timeWindow });
				await interaction.editReply({ content: options.content, files: [image] });
				const buffer = await createRankedImage(account, isContextMenu, 'br');
				if (buffer !== 'Unknown') {
					if (buffer === null) await interaction.followUp({ ephemeral: isContextMenu, content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
					else await interaction.followUp({ ephemeral: isContextMenu, files: [buffer] });
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
				if (buffer === null) await interaction.followUp({ ephemeral: isContextMenu, content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
				else await interaction.followUp({ ephemeral: isContextMenu, files: [buffer] });
			}

			if (interaction.isChatInputCommand() && interaction.options.getBoolean('link')) await linkEpicAccount(interaction, account, true);
		}
		catch (error) {
			await handleStatsError(interaction, error, options.accountType);
		}
	}
};

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
	const currentNames = currentNamesOrUndefined ?? await fetchShopNames(newState);

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