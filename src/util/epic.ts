import { EpicAPIError, type EpicStats, type HabaneroTrackProgress } from '@squiddleton/epic';
import type { TrackedUser } from './types.js';
import epicClient from '../clients/epic.js';
import config from '../config.js';

export const trackedModes = new Map<string, TrackedUser>();

const isEpicAuthError = (error: unknown) => error instanceof EpicAPIError && [400, 401].includes(error.status);

export const getLevelStats = async (accountId: string) => {
	let bulkStats: EpicStats[];
	try {
		bulkStats = await epicClient.fortnite.getBulkStats({ accountIds: [accountId] });
	}
	catch (error) {
		if (!isEpicAuthError(error)) throw error;

		await epicClient.auth.authenticate(config.epicDeviceAuth);
		console.log('Reauthenticated to retrieve level stats.');
		bulkStats = await epicClient.fortnite.getBulkStats({ accountIds: [accountId] });
	}
	return bulkStats[0].stats;
};

export const getTrackProgress = async (accountId: string) => {
	let trackProgress: HabaneroTrackProgress[];
	try {
		trackProgress = await epicClient.fortnite.getTrackProgress({ accountId });
	}
	catch (error) {
		if (!isEpicAuthError(error)) throw error;

		await epicClient.auth.authenticate(config.epicDeviceAuth);
		console.log('Reauthenticated to retrieve ranked stats.');
		trackProgress = await epicClient.fortnite.getTrackProgress({ accountId });
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