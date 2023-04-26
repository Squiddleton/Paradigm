import { EpicError } from './classes.js';
import { EncodedClient, EpicEndpoint, Seasons } from './constants.js';
import type { AuthResponse, AuthorizationCodeAccessTokenResponse, BlockList, DeviceAuth, DeviceAuthResponse, EpicAccount, Friend, RefreshTokenBody, Stats, Timeline } from './types.js';
import fortniteAPI from '../clients/fortnite.js';
import config from '../config.js';

/**
 * Returns fetch options required in making Epic Games API requests.
 *
 * @param accessToken - An Epic Games account access token
 * @param body - A JSON body to pass into the request
 * @returns The request body passed into making the API request
 */
const postBody = (accessToken: string, body: BodyInit): RequestInit => ({
	method: 'post',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `bearer ${accessToken}`
	},
	body
});

/**
 * Fetches an Epic Games API access token using an authentication method.
 *
 * @param body - The body for an OAuth2 authentication method
 * @returns An object containing the access token and other data
 */
export const getAccessToken = async <T extends RefreshTokenBody | DeviceAuth = DeviceAuth>(body?: T): Promise<AuthResponse<T>> => {
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
			const validated = EpicError.validate<AuthResponse<T>>(res);
			return validated;
		}
		catch (e) {
			lastError = e;
		}
	}

	throw lastError;
};

/**
 * Fetches a specific Epic Games endpoint.
 *
 * @param url - The endpoint to fetch
 * @param init - Custom options to pass into the request
 * @returns The output of the request
 */
export const epicFetch = async <Res = unknown>(url: string, init?: RequestInit) => {
	if (init === undefined) {
		const { access_token } = await getAccessToken();
		init = {
			headers: {
				Authorization: `bearer ${access_token}`
			}
		};
	}

	const res = await fetch(url, init);
	return EpicError.validate<Res>(res);
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
export const getDeviceAuth = async (accountName: string, authorizationCode: string): Promise<DeviceAuth> => {
	const stats = await fortniteAPI.stats({ name: accountName });
	const accountId = stats.account.id;

	const { access_token } = await epicFetch<AuthorizationCodeAccessTokenResponse>(EpicEndpoint.AccessToken, {
		method: 'post',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `basic ${EncodedClient}`
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code: authorizationCode
		})
	});

	const { deviceId, secret } = await epicFetch<DeviceAuthResponse>(EpicEndpoint.DeviceAuth.replace('{accountId}', accountId), {
		method: 'post',
		headers: {
			Authorization: `Bearer ${access_token}`
		}
	});

	return {
		grant_type: 'device_auth',
		account_id: accountId,
		device_id: deviceId,
		secret
	};
};

/**
 * Returns data for Epic Games accounts.
 *
 * @param nameOrId - An array of Epic Games usernames or an array of Epic Games account ids
 * @param isId - Whether the nameOrId argument is of name(s) or id(s)
 * @returns An array of Epic Games account objects
 */
export const getAccount = async (nameOrId: string | string[], isId = false) => {
	const namesOrIds = [nameOrId].flat();

	let ids: string[] = [];
	if (!isId) {
		for (const displayName of namesOrIds) {
			const res = await epicFetch<EpicAccount>(EpicEndpoint.AccountByDisplayName.replace('{displayName}', displayName));
			ids.push(res.id);
		}
	}
	else {
		ids = namesOrIds;
	}

	return epicFetch<EpicAccount[]>(`${EpicEndpoint.AccountById}?accountId=${ids.join('&accountId=')}`);
};

/**
 * Fetches an Epic Games account's blocked accounts.
 *
 * @param accountId - The user's Epic Games account id
 * @returns An array of blocked users
 */
export const getBlockList = (accountId: string) => epicFetch<BlockList>(EpicEndpoint.BlockList.replace('{accountId}', accountId)).then(r => r.blockedUsers);

/**
 * Fetches an Epic Games account's friends.
 *
 * @param accountId - The user's Epic Games account id
 * @returns An array of friend objects
 */
export const getFriends = (accountId: string) => epicFetch<Friend[]>(EpicEndpoint.Friends.replace('{accountId}', accountId));

/**
 * Fetches Epic Games accounts' levels in the past Fortnite seasons.
 *
 * @param accountIds - An array of Epic Games account ids
 * @param accessToken - An Epic Games account access token
 * @returns An array of objects with keys of the seasons and values of the user's level in the season
 */
export const getLevels = async (accountIds: string[], accessToken?: string) => {
	if (accessToken === undefined) {
		const { access_token } = await getAccessToken();
		accessToken = access_token;
	}

	const levels = await epicFetch<Stats[]>(
		EpicEndpoint.Levels,
		postBody(accessToken, JSON.stringify({
			appId: 'fortnite',
			startDate: 0,
			endDate: 0,
			owners: accountIds,
			stats: Seasons
		}))
	);

	return levels.map(level => level.stats);
};

/**
 * Fetches an Epic Games account's Fortnite stats.
 *
 * @param accountId - The user's Epic Games account id
 * @returns An object with the user's stats
 */
export const getStats = (accountId: string) => epicFetch<Stats>(EpicEndpoint.Stats.replace('{accountId}', accountId)).then(r => r.stats);

/**
 * Fetches the current Fortnite timeline endpoint.
 *
 * @returns An object containing relevant Fortnite data.
 */
export const getTimeline = () => epicFetch<Timeline>(EpicEndpoint.Timeline);

/**
 * Makes a POST request to Epic Games' MCP (Master Control Program) using one of many operations.
 *
 * @param operation - The operation to perform
 * @param profile - The type of profile to perform the operation on
 * @param payload - The body to send in the request
 * @returns The output of the request
 */
export const mcpRequest = async (operation: string, profile: 'common_public' | 'athena' | 'campaign', payload: Record<string, string> = {}) => {
	const { access_token, account_id } = await getAccessToken();

	return epicFetch(
		EpicEndpoint.MCP
			.replace('{accountId}', account_id)
			.replace('{operation}', operation)
			.replace('{profile}', profile),
		postBody(access_token, JSON.stringify(payload))
	);
};

/**
 * Claims the daily Save the World login reward.
 *
 * @returns The output of the request
 */
export const claimLoginReward = () => mcpRequest('ClaimLoginReward', 'campaign');

/**
 * Changes the authenticated user's Save the World homebase name.
 *
 * @deprecated Homebase names are no longer visible in-game, so this method may be unsuccessful.
 *
 * @param homebaseName - The new homebase name
 * @returns The output of the request
 */
export const setHomebaseName = (homebaseName: string) => mcpRequest('SetHomebaseName', 'common_public', { homebaseName });