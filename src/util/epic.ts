import { EpicAPIError, type EpicClient, getBattlePassLevels, type EpicStats, type HabaneroTrackProgress, type ShortHabaneroTrack, type TimelineChannelData, type TimelineClientEventsState } from '@squiddleton/epic';
import type { FortniteWebsite, STWProgress, STWPublicProfile, TrackedUser } from './types.js';
import epicClient from '../clients/epic.js';
import config from '../config.js';
import { AccessibleChannelPermissions, ChapterLengths, divisionNames, EpicEndpoint, ErrorMessage, RankedTrack, RankingType } from './constants.js';
import { quantify } from '@squiddleton/util';
import type { DiscordClient } from './classes.js';
import guildModel from '../models/guilds.js';
import { codeBlock, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { EpicAccount } from '@squiddleton/fortnite-api';
import { isUnknownRank } from './fortnite.js';

export const trackedModes = new Map<string, TrackedUser>();

export const isEpicAuthError = (error: unknown) => error instanceof EpicAPIError && error.status >= 500 && error.status < 600;
export const isEpicInternalError = (error: unknown) => error instanceof EpicAPIError && [400, 401].includes(error.status);

export const callEpicFunction = async <T>(callback: (client: EpicClient) => T): Promise<T> => {
	let ret: T;
	try {
		ret = await callback(epicClient);
	}
	catch (error) {
		if (isEpicInternalError(error)) throw new Error('The Epic Games stats API is currently unavailable. Please try again in a few minutes.');
		else if (!isEpicAuthError(error)) throw error;

		await epicClient.auth.authenticate(config.epicDeviceAuth);
		ret = await callback(epicClient);
	}
	return ret;
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
export const fetchStates = () => callEpicFunction(client => client.fortnite.getTimeline().then(timeline => timeline.channels['client-events'].states));

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

const privateAccounts = new Set();

export const getSTWProgress = async (accountId: string): Promise<STWProgress[] | null> => {
	const getProfile = (client: EpicClient): Promise<STWPublicProfile> => client.fortnite.postMCPOperation('QueryPublicProfile', 'campaign', undefined, 'public', accountId) as Promise<STWPublicProfile>;
	const profile = await callEpicFunction(getProfile);

	privateAccounts.delete(accountId);
	const achievementQuests = [
		{ templateId: 'Quest:achievement_killmistmonsters', name: 'Kill Mist Monsters', increment: 1_000, max: 20_000 },
		{ templateId: 'Quest:achievement_playwithothers', name: 'Play with Others', increment: 50, max: 1_000 },
		{ templateId: 'Quest:achievement_explorezones', name: 'Explore Zones', increment: 50, max: 1_500 },
		{ templateId: 'Quest:achievement_buildstructures', name: 'Build Structures', increment: 10_000, max: 500_000 },
		{ templateId: 'Quest:achievement_savesurvivors', name: 'Save Survivors', increment: 100, max: 10_000 }
	];

	const items = Object.values(profile.profileChanges[0].profile.items).filter(item => achievementQuests.some(quest => item.templateId === quest.templateId));

	return items.map(item => {
		const quest = achievementQuests.find(quest => quest.templateId === item.templateId);
		if (quest === undefined) throw new Error(`No quest found with the template id ${item.templateId}`);
		const completion = Object.entries<string | number>(item.attributes).find(([k]) => k.startsWith('completion'));
		if (!completion || typeof completion[1] !== 'number') throw new Error(`No completion found for the quest with the template id ${item.templateId}: ${completion}`);
		return {
			accountId,
			active: item.attributes.quest_state === 'Active',
			template: item.templateId,
			completion: completion[1],
			questName: quest.name,
			max: quest.max,
			increment: quest.increment,
			updatedAt: item.attributes.last_state_change_time
		};
	});
};

export const createSTWProgressImage = async () => {
	const w = 1800;
	const h = 900;
	const canvas = createCanvas(w, h);
	const ctx = canvas.getContext('2d');

	const image = await loadImage('https://preview.redd.it/tc6ghw1yaln71.png?width=640&crop=smart&auto=webp&s=91c394ba4100998ff112a8e73d67268d9448d421');
	ctx.drawImage(image, 0, 0, w, h);

	const fontSize = 75;
	ctx.font = `${fontSize}px fortnite, jetbrains`;
	ctx.fillStyle = 'white';
	ctx.textAlign = 'center';

	const accounts = [
		{ i: 'fa646860d86c4def9716359b4d1a0ff8', n: 'Squid', c: -1 },
		{ i: '7df93ec9c5864474ba1ab22e82a8ac64', n: 'Jake', c: -1 },
		{ i: '1b57ac3f27af49e09c0d2c874e180ff4', n: 'Riley', c: -1 },
		{ i: 'e3180e59cf4c4ad59985a9aa7c2623d2', n: 'Koba', c: -1 }
	];

	const quests = ['Kill Mist Monsters', 'Build Structures', 'Explore Zones', 'Play with Others', 'Save Survivors'];

	ctx.fillText('STW Progress', w / 2, fontSize * 1.2);

	for (let i = 0; i < accounts.length; i++) {
		const account = accounts[i];
		const y = h * (i + 1.5) / 5;
		ctx.fillText(account.n, w / 15, y);

		const allProgress = await getSTWProgress(account.i);
		if (allProgress === null) continue;

		for (let j = 0; j < quests.length; j++) {
			const quest = quests[j];
			const progress = allProgress.find(a => a.questName === quest);
			if (progress === undefined) {
				console.error(`No progress found for quest ${quest}:`, progress);
				continue;
			}
			if (!progress.active) ctx.fillStyle = 'green';
			ctx.fillText(progress.completion.toString(), w * (j + 1.5) / 6, y);

			ctx.font = `${fontSize / 2}px fortnite, jetbrains`;
			if (progress.active) {
				ctx.fillText(`${Math.floor(progress.completion * 100 / progress.max)}%`, w * (j + 1.5) / 6, y + fontSize * 0.8);
			}
			else {
				const date = new Date(progress.updatedAt);
				const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
				ctx.fillText(`Done ${month} ${date.getDate()}, ${date.getFullYear()}`, w * (j + 1.5) / 6, y + fontSize * 0.8);
			}

			ctx.font = `${fontSize}px fortnite, jetbrains`;
			ctx.fillStyle = 'white';
		}
	}

	ctx.font = `${fontSize / 2}px fortnite, jetbrains`;
	for (let i = 0; i < quests.length; i++) {
		const quest = quests[i];
		ctx.fillText(quest, w * (i + 1.5) / 6, h / 5);
	}

	const buffer = await canvas.encode('jpeg');
	return buffer;
};

export function createRankedImage(account: EpicAccount, returnUnknown: true, rankingType: 'br' | 'rr' | 'b', season?: string | null): Promise<Buffer | null>;
export function createRankedImage(account: EpicAccount, returnUnknown: boolean, rankingType: 'br' | 'rr' | 'b', season?: string | null): Promise<Buffer | null | 'Unknown'>;
export async function createRankedImage(account: EpicAccount, returnUnknown: boolean, rankingType: 'br' | 'rr' | 'b', season: string | null = 'c6s2') {
	const trackProgress = await getTrackProgress(account.id);
	if (trackProgress === null) return null;

	const getTrack = (trackguid: RankedTrack) => {
		const track = trackProgress.find(t => t.trackguid === trackguid);
		if (track === undefined) throw new Error(`No track was found for guid ${trackguid}`);
		return track;
	};

	const currentTracks = await getCurrentRankedTracks();
	let seasonName: string;
	let brTrackguid = currentTracks[RankingType.BattleRoyale].trackguid as RankedTrack;
	let zbTrackguid = currentTracks[RankingType.ZeroBuild].trackguid as RankedTrack;
	let ballisticTrackguid = currentTracks[RankingType.Ballistic].trackguid as RankedTrack;
	let racingTrackguid = currentTracks[RankingType.RocketRacing].trackguid as RankedTrack;
	let backgroundPath = 'general.jpg';
	let invertText = false;

	switch (season) {
		// Battle Royale
		case null:
		case 'gb': {
			seasonName = 'Galactic Battle';
			brTrackguid = RankedTrack.GalacticBattleBR;
			zbTrackguid = RankedTrack.GalacticBattleZB;
			break;
		}
		case 'c6s2': {
			seasonName = 'Chapter 6 Season 2';
			brTrackguid = RankedTrack.C6S2BR;
			zbTrackguid = RankedTrack.C6S2ZB;
			break;
		}
		case 'c6s1': {
			seasonName = 'Chapter 6 Season 1';
			brTrackguid = RankedTrack.C6S1BR;
			zbTrackguid = RankedTrack.C6S1ZB;
			break;
		}
		case 'remix': {
			seasonName = 'Fortnite: Remix';
			brTrackguid = RankedTrack.RemixBR;
			zbTrackguid = RankedTrack.RemixZB;
			backgroundPath = 'og.jpg';
			invertText = true;
			break;
		}
		case 'c5s4': {
			seasonName = 'Chapter 5 Season 4';
			brTrackguid = RankedTrack.C5S4BR;
			zbTrackguid = RankedTrack.C5S4ZB;
			racingTrackguid = RankedTrack.InfernoIslandRacing;
			backgroundPath = 'general.jpg';
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
			invertText = true;
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
			break;
		}
		// Reload
		case 'reloads3': {
			seasonName = 'Reload';
			brTrackguid = RankedTrack.S3ReloadBR;
			zbTrackguid = RankedTrack.S3ReloadZB;
			backgroundPath = 'og.jpg';
			invertText = true;
			break;
		}
		case 'reloads2': {
			seasonName = 'Reload';
			brTrackguid = RankedTrack.S2ReloadBR;
			zbTrackguid = RankedTrack.S2ReloadZB;
			backgroundPath = 'og.jpg';
			invertText = true;
			break;
		}
		case 'reloadremix': {
			seasonName = 'Reload Remix';
			brTrackguid = RankedTrack.RemixReloadBR;
			zbTrackguid = RankedTrack.RemixReloadZB;
			backgroundPath = 'og.jpg';
			invertText = true;
			break;
		}
		case 'reloads0': {
			seasonName = 'Reload Season Zero';
			brTrackguid = RankedTrack.S0ReloadBR;
			zbTrackguid = RankedTrack.S0ReloadZB;
			backgroundPath = 'og.jpg';
			invertText = true;
			break;
		}
		// Rocket Racing
		case RankedTrack.May25Racing: {
			racingTrackguid = season;
			seasonName = 'May 2025';
			backgroundPath = 'rr-s0.webp';
			break;
		}
		case RankedTrack.Feb25Racing: {
			racingTrackguid = season;
			seasonName = 'February 2025';
			backgroundPath = 'rr-s0.webp';
			break;
		}
		case RankedTrack.Dec24Racing: {
			racingTrackguid = season;
			seasonName = 'December 2024';
			backgroundPath = 'rr-s0.webp';
			break;
		}
		case RankedTrack.Oct24Racing: {
			racingTrackguid = season;
			seasonName = 'October 2024';
			backgroundPath = 'rr-oct24.webp';
			break;
		}
		case RankedTrack.InfernoIslandRacing: {
			racingTrackguid = season;
			seasonName = 'Inferno Island';
			backgroundPath = 'rr-ii.jpg';
			break;
		}
		case RankedTrack.NeonRushRacing: {
			racingTrackguid = season;
			seasonName = 'Neon Rush';
			backgroundPath = 'rr-nn.webp';
			break;
		}
		case RankedTrack.S0Racing: {
			racingTrackguid = season;
			seasonName = 'Season Zero';
			backgroundPath = 'rr-s0.webp';
			break;
		}
		// Ballistic
		case RankedTrack.BallisticS0: {
			ballisticTrackguid = season;
			seasonName = 'Chapter 6 Season 1';
			backgroundPath = 'ballistic.jpg';
			break;
		}
		case RankedTrack.BallisticRAndDS1: {
			ballisticTrackguid = season;
			seasonName = 'Ballistic R&D Season 1';
			backgroundPath = 'ballistic.jpg';
			break;
		}
		default: {
			throw new Error(`No case found for season ${season}`);
		}
	}
	const brTrack = getTrack(brTrackguid);
	const zbTrack = getTrack(zbTrackguid);

	if (!returnUnknown && brTrack.currentDivision === 0 && brTrack.promotionProgress === 0 && zbTrack.currentDivision === 0 && zbTrack.promotionProgress === 0) return 'Unknown';

	const background = await loadImage(`./assets/backgrounds/${backgroundPath}`);
	const { height, width } = background;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.drawImage(background, 0, 0);

	const fontSize = height / 8;

	ctx.font = `${fontSize}px fortnite, jetbrains`;
	ctx.textAlign = 'center';
	ctx.fillStyle = invertText ? 'black' : 'white';

	ctx.fillText(`${seasonName === 'Reload' ? 'Ranked Reload' : `${seasonName} Ranked`}: ${account.name}`, width / 2, fontSize, width);

	ctx.font = `${fontSize / 2}px fortnite, jetbrains`;
	if (rankingType === 'rr') {
		ctx.fillText('Rocket Racing', width * 0.5, height - (fontSize / 4), width / 2);
	}
	else if (rankingType === 'b') {
		ctx.fillText('Ballistic', width * 0.5, height - (fontSize / 4), width / 2);
	}
	else {
		ctx.fillText('Battle Royale', width * 0.25, height - (fontSize / 4), width / 2);
		ctx.fillText('Zero Build', width * 0.75, height - (fontSize / 4), width / 2);
	}

	const drawRankedImage = async (xOffset: number, progress: HabaneroTrackProgress) => {
		const start = 1.5 * Math.PI;
		const end = (2 * Math.PI * progress.promotionProgress) - (0.5 * Math.PI);

		const vertexX = xOffset + (width / 4);
		const vertexY = height / 2;
		const radius = height * 0.3;

		const iconWidth = width / 5;

		ctx.lineWidth = height / 36;

		const isUnknown = isUnknownRank(progress);
		const divisionIconName = isUnknown
			? 'unknown'
			: divisionNames[progress.currentDivision].toLowerCase().replace(' ', '');

		if (progress.currentPlayerRanking === null) {
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
		ctx.fillStyle = invertText ? 'purple' : 'yellow';
		const divisionName = isUnknown ? 'Unknown' : divisionNames[progress.currentDivision];
		const text = divisionName === 'Unknown' ? divisionName : `${divisionName} ${progress.currentPlayerRanking === null ? `${Math.floor(progress.promotionProgress * 100)}%` : `#${progress.currentPlayerRanking}`}`;
		ctx.fillText(text, xOffset + (width / 4), height * 0.9, width / 2);
	};

	if (rankingType === 'rr') {
		const progress = getTrack(racingTrackguid);
		await drawRankedImage(width * 0.25, progress);
	}
	else if (rankingType === 'b') {
		const progress = getTrack(ballisticTrackguid);
		await drawRankedImage(width * 0.25, progress);
	}
	else {
		await drawRankedImage(0, brTrack);
		await drawRankedImage(width * 0.5, zbTrack);
	}

	const buffer = await canvas.encode('jpeg');
	return buffer;
}

export const getLevelStats = async (accountId: string): Promise<Partial<Record<string, number>> | string> => {
	const seasons = ChapterLengths.reduce((p, c) => p + c, 0);
	const stats = getBattlePassLevels(seasons).filter(s => s !== 's12_social_bp_level').slice(-20);
	const getBulkStats = (client: EpicClient) => client.fortnite.getBulkStats({ accountIds: [accountId], stats });
	const bulkStats = await callEpicFunction(getBulkStats);

	if (bulkStats.length === 0) return 'This account\'s stats are private. If this is your account, go into Fortnite => Settings => Account and Privacy => Public Game Stats => On.';
	return bulkStats[0].stats;
};

export const getRankedStats = async (accountId: string): Promise<EpicStats['stats'] | null> => {
	const stats = await callEpicFunction(client => client.fortnite.getStats(accountId));
	return stats.stats;
};

export const getRankedTracks = async (): Promise<ShortHabaneroTrack[] | null> => {
	return callEpicFunction(client => client.fortnite.getTracks());
};

export const getCurrentRankedTrack = async (rankingType: RankingType): Promise<ShortHabaneroTrack> => {
	const tracks = await getRankedTracks();
	if (tracks === null)
		throw new Error('Cannot fetch ranked tracks.');

	const now = Date.now();
	const track = tracks.find(t => t.rankingType === rankingType && new Date(t.beginTime).getTime() < now && new Date(t.endTime).getTime() > now);
	if (track === undefined)
		throw new Error(`No current ranked track found for type ${rankingType}.`);

	return track;
};

export const getCurrentRankedTracks = async (): Promise<Record<RankingType, ShortHabaneroTrack>> => {
	const tracks = await getRankedTracks();
	if (tracks === null)
		throw new Error('Cannot fetch ranked tracks.');

	const ret: Record<string, ShortHabaneroTrack> = {};
	const now = Date.now();
	for (const t of tracks) {
		if (new Date(t.beginTime).getTime() < now && new Date(t.endTime).getTime() > now)
			ret[t.rankingType] = t;
	}

	return ret;
};

export const getTrackProgress = async (accountId: string): Promise<HabaneroTrackProgress[] | null> => {
	return callEpicFunction(client => client.fortnite.getTrackProgress({ accountId }));
};

/**
 * Claims the daily Save the World login reward.
 *
 * @returns The output of the request
 */
export const claimLoginReward = () => callEpicFunction(client => client.fortnite.postMCPOperation('ClaimLoginReward', 'campaign'));

/**
 * Changes the authenticated user's Save the World homebase name.
 *
 * @deprecated Homebase names are no longer visible in-game, so this method may be unsuccessful.
 *
 * @param homebaseName - The new homebase name
 * @returns The output of the request
 */
export const setHomebaseName = (homebaseName: string) => callEpicFunction(client => client.fortnite.postMCPOperation('SetHomebaseName', 'common_public', { homebaseName }));