import { GlobalFonts, type Image, createCanvas, loadImage } from '@napi-rs/canvas';
import { EpicAPIError, type HabaneroTrackProgress, type TimelineChannelData, type TimelineClientEventsState } from '@squiddleton/epic';
import { type Cosmetic, type EpicAccount, FortniteAPIError } from '@squiddleton/fortnite-api';
import { formatPossessive, getRandomItem, normalize, quantify, removeDuplicates, sum } from '@squiddleton/util';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, type Client, type ColorResolvable, Colors, type CommandInteraction, ComponentType, EmbedBuilder, type InteractionReplyOptions, type MessageActionRowComponentBuilder, PermissionFlagsBits, StringSelectMenuBuilder, bold, chatInputApplicationCommandMention, codeBlock, hideLinkEmbed, time, underscore, userMention } from 'discord.js';
import type { DiscordClient } from './classes.js';
import { AccessibleChannelPermissions, BackgroundURL, ChapterLengths, DiscordIds, EpicEndpoint, ErrorMessage, RankedTrack, RarityColors, Time } from './constants.js';
import { createPaginationButtons, isKey, messageComponentCollectorFilter, paginate } from './functions.js';
import type { ButtonOrMenu, CosmeticDisplayType, Dimensions, DisplayUserProperties, FortniteWebsite, LevelCommandOptions, Links, StatsCommandOptions, StringOption } from './types.js';
import { getUser, setEpicAccount } from './users.js';
import epicClient from '../clients/epic.js';
import fortniteAPI from '../clients/fortnite.js';
import config from '../config.js';
import guildModel from '../models/guilds.js';
import userModel from '../models/users.js';

let cachedCosmetics: Cosmetic[] = [];

export const getCosmetics = () => cachedCosmetics;
export const fetchCosmetics = async () => {
	cachedCosmetics = await fortniteAPI.listCosmetics();
};

/**
 * Returns the cosmetics currently in the Fortnite item shop.
 *
 * @returns An array of cosmetic objects
 */
export const fetchItemShop = async () => {
	const rawAPI = await fortniteAPI.shop({ combined: true });

	const withoutDupes: Cosmetic[] = [];
	const featured = rawAPI.featured?.entries ?? [];
	const daily = rawAPI.daily?.entries ?? [];
	const withDupes = featured.concat(daily).map(e => e.items).flat();

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
export const fetchShopNames = async (state: TimelineChannelData<TimelineClientEventsState>) => {
	const fortniteWebsite: FortniteWebsite = await fetch(EpicEndpoint.Website).then(res => res.json());
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
		const cosmeticById = await fortniteAPI.findCosmetic({ id: input });
		return cosmeticById;
	}
	catch {
		try {
			const cosmeticByName = await fortniteAPI.findCosmetic({ name: input });
			return cosmeticByName;
		}
		catch {
			const list = getCosmetics();
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
					if (items.length > 0) messages.push(`${userMention(user._id)}: ${items.slice(0, 10).join(', ')}${items.length > 10 ? ', and more!' : ''}`);
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
export const getCosmeticColor = (cosmetic: Cosmetic): ColorResolvable | null => {
	const seriesColor = cosmetic.series?.colors[0].slice(0, 6);
	return seriesColor === undefined ? RarityColors[cosmetic.rarity.displayValue] ?? null : `#${seriesColor}`;
};

/**
 * Returns an embed describing a cosmetic.
 *
 * @param cosmetic - A cosmetic object
 * @returns An embed filled with information about the specified cosmetic
 */
export const createCosmeticEmbed = (cosmetic: Cosmetic) => {
	const embed = new EmbedBuilder()
		.setTitle(cosmetic.name)
		.setDescription(cosmetic.description)
		.setColor(getCosmeticColor(cosmetic))
		.setThumbnail(cosmetic.images.smallIcon)
		.setImage(cosmetic.images.featured ?? cosmetic.images.icon)
		.setFields([
			{ name: 'Type', value: cosmetic.type.displayValue, inline: true },
			{ name: 'Rarity', value: cosmetic.rarity.displayValue, inline: true },
			{ name: 'Set', value: cosmetic.set?.value ?? 'None', inline: true },
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
	const cosmetics = getCosmetics();
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
			if (icon === null) return `Your ${displayType} has no image; please try a different one!`;
			image = await loadImage(icon);
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
	const cosmetics = getCosmetics();
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
						.setStyle(ButtonStyle.Primary)
				]
			})
		);
	}

	const content = embeds.length > 0 ? hideLinkEmbed('https://twitter.com/FortniteGame/status/1068655953699053568') : null;

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
 * Returns a string representative of an error thrown from fetching a user's levels.
 *
 * @param e - The thrown error
 * @returns A string explaining the error to the command user
 */
const getStatsErrorMessage = (e: unknown) => {
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
	console.error(e);
	return 'There was an error while fetching the account.';
};

/**
 * Returns the content for a message containing a user's final level in each Fortnite season.
 *
 * @param client - A ready Discord client
 * @param options - Options specifying the Discord user and their Epic Games account
 * @returns Options for replying to an interaction and, if found, the user's Epic Games account
 */
export const getLevelsString = async (client: Client<true>, options: LevelCommandOptions): Promise<InteractionReplyOptions & { account?: EpicAccount }> => {
	const { accountName, accountType } = options;

	/**
	 * Returns a string including each Fortnite season and the user's respective level.
	 *
	 * @param levels - An object with keys of the seasons and values of the user's level in the season
	 * @param name - The user's Epic Games account username
	 * @returns A string with a header including the user's Epic Games username and a body of the user's levels in each season
	 */
	const formatLevels = (levels: Partial<Record<string, number>>) => `${bold(`${formatPossessive(options.targetUser.username)} Battle Pass Levels`)}\n${Object
		.entries(levels)
		.sort()
		.map(([k, v]) => {
			const overallSeason = parseInt(k.match(/\d+/)![0]);
			const index = ChapterLengths.findIndex((length, i) => overallSeason <= ChapterLengths.slice(0, i + 1).reduce(sum));
			const chapterIndex = index === -1 ? ChapterLengths.length : index;
			return `Chapter ${chapterIndex + 1}, Season ${overallSeason - ChapterLengths.slice(0, chapterIndex).reduce(sum)}: ${Math.floor((v ?? 0) / 100)}`;
		})
		.join('\n')}`;

	if (accountName === null) {
		const userResult = getUser(options.targetUser.id);
		if (userResult === null || userResult.epicAccountId === null) {
			return { content: `No player username was provided, and you have not linked your account with ${client.user.username}.`, ephemeral: true };
		}

		try {
			const [{ stats }] = await epicClient.fortnite.getBulkStats({ accountIds: [userResult.epicAccountId] });
			return { content: formatLevels(stats) };
		}
		catch (error) {
			return { content: getStatsErrorMessage(error), ephemeral: true };
		}
	}
	else {
		try {
			const { account } = await fortniteAPI.stats({ name: accountName, accountType });
			const [{ stats }] = await epicClient.fortnite.getBulkStats({ accountIds: [account.id] });
			return { content: formatLevels(stats), account };
		}
		catch (error) {
			return { content: getStatsErrorMessage(error), ephemeral: true };
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
export const handleStatsError = (interaction: CommandInteraction, e: unknown) => interaction[interaction.deferred || interaction.replied ? 'followUp' : 'reply'](getStatsErrorMessage(e));

/**
 * Links a Discord user's account to an Epic Games account.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param account - An Epic Games account object
 * @param ephemeral - Whether the response should only be visible to the user
 */
export const linkEpicAccount = async (interaction: ChatInputCommandInteraction, account: EpicAccount, ephemeral = false) => {
	await setEpicAccount(interaction.user.id, account.id);
	await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, ephemeral });
};

export function createRankedImage(account: EpicAccount, returnUnknown: true): Promise<Buffer>;
export function createRankedImage(account: EpicAccount, returnUnknown: boolean): Promise<Buffer | null>;
export async function createRankedImage(account: EpicAccount, returnUnknown: boolean) {
	let trackProgress: HabaneroTrackProgress[];
	try {
		trackProgress = await epicClient.fortnite.getTrackProgress({ accountId: account.id });
	}
	catch (error) {
		if (!(error instanceof EpicAPIError) || error.status !== 401) throw error;

		await epicClient.auth.authenticate(config.epicDeviceAuth.device1);
		trackProgress = await epicClient.fortnite.getTrackProgress({ accountId: account.id });
	}

	const getTrack = (trackguid: string) => {
		const track = trackProgress.find(t => t.trackguid === trackguid);
		if (track === undefined) throw new Error(`No track was found for guid ${trackguid}`);
		return track;
	};
	const brTrack = getTrack(RankedTrack.OGBR);
	const zbTrack = getTrack(RankedTrack.OGZB);

	if (!returnUnknown && brTrack.currentDivision === 0 && brTrack.promotionProgress === 0 && zbTrack.currentDivision === 0 && zbTrack.promotionProgress === 0) return null;

	const background = await loadImage('./assets/ranked/background.jpg');
	const { height, width } = background;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.drawImage(background, 0, 0);

	GlobalFonts.registerFromPath('./fonts/fortnite.otf', 'fortnite');
	const fontSize = height / 8;

	ctx.font = `${fontSize}px fortnite`;
	ctx.textAlign = 'center';
	ctx.fillStyle = '#ffffff';

	ctx.fillText(`Fortnite: OG Ranked: ${account.name}`, width / 2, fontSize, width);

	ctx.font = `${fontSize / 2}px fortnite`;
	ctx.fillText('Battle Royale', width / 4, height - (fontSize / 4), width / 2);
	ctx.fillText('Zero Build', width * 0.75, height - (fontSize / 4), width / 2);

	const drawRankedImage = async (xOffset: number, track: HabaneroTrackProgress) => {
		const start = 1.5 * Math.PI;
		const end = (2 * Math.PI * track.promotionProgress) - (0.5 * Math.PI);

		const vertexX = xOffset + (width / 4);
		const vertexY = height / 2;
		const radius = height * 0.3;

		const iconWidth = width / 5;

		ctx.lineWidth = 30;

		const divisionNames = ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Platinum I', 'Platinum II', 'Platinum III', 'Diamond I', 'Diamond II', 'Diamond III', 'Elite', 'Champion', 'Unreal'];
		const isUnknown = track.currentDivision === 0 && track.promotionProgress === 0 && new Date(track.lastUpdated).getTime() === 0;
		const divisionIconName = isUnknown
			? 'unknown'
			: divisionNames[track.currentDivision].toLowerCase().replace(' ', '');


		if (track.currentPlayerRanking === null) {
			ctx.beginPath();
			ctx.arc(vertexX, vertexY, iconWidth / 1.5, 0, 2 * Math.PI);
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
		if (divisionIconName === 'unreal') ctx.drawImage(divisionIcon, (width * 0.15 + xOffset) / 1.5, height / 4.5, iconWidth * 1.5, iconWidth * 1.5);
		else ctx.drawImage(divisionIcon, width * 0.15 + xOffset, height / 3, iconWidth, iconWidth);

		ctx.font = `${fontSize * 0.5}px fortnite`;
		ctx.fillStyle = 'yellow';
		const divisionName = isUnknown ? 'Unknown' : divisionNames[track.currentDivision];
		ctx.fillText(`${divisionName} ${track.currentPlayerRanking === null ? `${Math.floor(track.promotionProgress * 100)}%` : `#${track.currentPlayerRanking}`}`, xOffset + (width / 4), height * 0.9, width / 2);
	};
	await drawRankedImage(0, brTrack);
	await drawRankedImage(width / 2, zbTrack);

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
		if (userResult === null || userResult.epicAccountId === null) {
			if (options.content !== undefined) await interaction.editReply(`${options.targetUser.username} has not linked their Epic account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
			else await interaction.editReply(`No player username was provided, and you have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
		}
		else {
			try {
				const { account, image } = await fortniteAPI.stats({ id: userResult.epicAccountId, image: options.input, timeWindow: options.timeWindow });
				await interaction.editReply({ content: options.content, files: [image] });
				const buffer = await createRankedImage(account, isContextMenu);
				if (buffer !== null) await interaction.followUp({ ephemeral: isContextMenu, files: [buffer] });
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
			const buffer = await createRankedImage(account, isContextMenu);
			if (buffer !== null) await interaction.followUp({ ephemeral: isContextMenu, files: [buffer] });

			if (interaction.isChatInputCommand() && interaction.options.getBoolean('link')) await linkEpicAccount(interaction, account, true);
		}
		catch (error) {
			await handleStatsError(interaction, error);
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
	const userResult = getUser(user.id);
	if (!userResult?.wishlistCosmeticIds.length) {
		await interaction.editReply({ content: `${user.same ? 'Your' : formatPossessive(user.username)} wishlist is currently empty.` });
		return;
	}

	const cosmetics = getCosmetics();
	const inc = 25;
	const cosmeticStrings = userResult.wishlistCosmeticIds
		.map(id => {
			const cosmetic = cosmetics.find(c => c.id === id);
			if (cosmetic === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', id));
			const type = cosmetic.type.displayValue;
			return `${cosmetic.name}${type === 'Outfit' ? '' : ` (${type})`}`;
		})
		.sort((a, b) => a.localeCompare(b));

	const embed = new EmbedBuilder()
		.setColor(user.color)
		.setDescription(`${underscore(`Cosmetics (${cosmeticStrings.length}):`)}\n${cosmeticStrings.slice(0, inc).join('\n')}`)
		.setThumbnail(user.avatar)
		.setTitle(`${formatPossessive(user.username)} Wishlist`);

	const willUseButtons = cosmeticStrings.length > inc;
	const buttons = createPaginationButtons();

	const message = await interaction.editReply({
		components: willUseButtons ? [new ActionRowBuilder<ButtonBuilder>({ components: buttons })] : [],
		embeds: [embed]
	});

	if (willUseButtons) paginate(interaction, message, embed, buttons, 'Cosmetics', cosmeticStrings, inc);
};