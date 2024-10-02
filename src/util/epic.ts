import { EpicAPIError, getBattlePassLevels, type EpicStats, type HabaneroTrackProgress } from '@squiddleton/epic';
import type { TrackedUser } from './types.js';
import epicClient from '../clients/epic.js';
import config from '../config.js';
import { ChapterLengths } from './constants.js';

export const trackedModes = new Map<string, TrackedUser>();

const isEpicAuthError = (error: unknown) => error instanceof EpicAPIError && error.status === 500;
const isEpicInternalError = (error: unknown) => error instanceof EpicAPIError && [400, 401].includes(error.status);

export const getLevelStats = async (accountId: string): Promise<Partial<Record<string, number>> | null> => {
	const seasons = ChapterLengths.reduce((p, c) => p + c, 0);
	const stats = getBattlePassLevels(seasons).filter(s => s !== 's12_social_bp_level').slice(-20);
	let bulkStats: EpicStats[];
	try {
		bulkStats = await epicClient.fortnite.getBulkStats({ accountIds: [accountId], stats });
	}
	catch {
		try {
			await epicClient.auth.authenticate(config.epicDeviceAuth);
		}
		catch (error) {
			if (isEpicInternalError(error)) return null;
			else if (!isEpicAuthError(error)) throw error;
		}
		bulkStats = await epicClient.fortnite.getBulkStats({ accountIds: [accountId], stats });
		console.log('Reauthenticated to retrieve level stats.');
	}
	return bulkStats[0].stats;
};

export const getTrackProgress = async (accountId: string): Promise<HabaneroTrackProgress[] | null> => {
	let trackProgress: HabaneroTrackProgress[];
	try {
		trackProgress = await epicClient.fortnite.getTrackProgress({ accountId });
	}
	catch (error) {
		try {
			await epicClient.auth.authenticate(config.epicDeviceAuth);
		}
		catch (error) {
			if (isEpicInternalError(error)) return null;
			else if (!isEpicAuthError(error)) throw error;
		}
		trackProgress = await epicClient.fortnite.getTrackProgress({ accountId });
		console.log('Reauthenticated to retrieve ranked stats.');
	}
	return trackProgress;
};

/**
 * Claims the daily Save the World login reward.
 *
 * @returns The output of the request
 */
export const claimLoginReward = () => epicClient.fortnite.postMCPOperation('ClaimLoginReward', 'campaign');

/**
 * Changes the authenticated user's Save the World homebase name.
 *
 * @deprecated Homebase names are no longer visible in-game, so this method may be unsuccessful.
 *
 * @param homebaseName - The new homebase name
 * @returns The output of the request
 */
export const setHomebaseName = (homebaseName: string) => epicClient.fortnite.postMCPOperation('SetHomebaseName', 'common_public', { homebaseName });