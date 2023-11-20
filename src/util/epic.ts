import { type AnyGrant, type DeviceAuthGrant, EpicAPIError, type EpicAuthResponse, type EpicStats, type HabaneroTrackProgress } from '@squiddleton/epic';
import { EncodedClient, EpicEndpoint } from './constants.js';
import epicClient from '../clients/epic.js';
import config from '../config.js';

/**
 * Fetches an Epic Games API access token using an authentication method.
 *
 * @param body - The body for an OAuth2 authentication method
 * @returns An object containing the access token and other data
 */
export const getAccessToken = async <T extends AnyGrant>(body?: T): Promise<EpicAuthResponse> => {
	const bodies = body === undefined ? [config.epicDeviceAuth.device1, config.epicDeviceAuth.device2] : [body];

	let lastError: unknown;

	for (const b of bodies) {
		try {
			const res = await fetch(
				EpicEndpoint.AccessToken,
				{
					method: 'post',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `basic ${EncodedClient}`
					},
					body: new URLSearchParams({ ...b })
				}
			);
			const validated: EpicAuthResponse = await res.json();
			return validated;
		}
		catch (error) {
			lastError = error;
		}
	}

	throw lastError;
};

/**
 * Get a temporary access token using device auth
 *
 * @remarks
 *
 * You must be logged in to the same Epic account at {@link https://www.epicgames.com} as the accountName
 *
 * @param accountName - The Epic account username
 * @param authorizationCode - {@link https://www.epicgames.com/id/api/redirect?clientId=3446cd72694c4a4485d81b77adbb2141&responseType=code | The authorization code found here}
 * @returns Device auth credentials
 */
export const getDeviceAuth = async (accountName: string, authorizationCode: string): Promise<DeviceAuthGrant> => {
	const { id } = await epicClient.getAccountByDisplayName(accountName);

	const { access_token } = await epicClient.auth.authenticate({ grant_type: 'authorization_code', code: authorizationCode });

	const { deviceId, secret } = await epicClient.auth.getDeviceAuth(id, access_token);

	return {
		grant_type: 'device_auth',
		account_id: id,
		device_id: deviceId,
		secret
	};
};

const isEpicAuthError = (error: unknown) => error instanceof EpicAPIError && [400, 401].includes(error.status);

export const getLevelStats = async (accountId: string) => {
	let bulkStats: EpicStats[];
	try {
		bulkStats = await epicClient.fortnite.getBulkStats({ accountIds: [accountId] });
	}
	catch (error) {
		if (!isEpicAuthError(error)) throw error;

		await epicClient.auth.authenticate(config.epicDeviceAuth.device1);
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

		await epicClient.auth.authenticate(config.epicDeviceAuth.device1);
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