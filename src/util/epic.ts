import fetch, { BodyInit, RequestInit, Response } from 'node-fetch';
import config from '../config.js';
import fortniteAPI from '../clients/fortnite.js';
import type { AccessTokenAndId, AccessTokenResponse, AuthorizationCodeResponse, BlockList, DeviceAuth, DeviceAuthResponse, EpicAccount, Friend, RawEpicError, Stats } from '../types.js';

enum Endpoints {
	AccessToken = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
	DeviceAuth = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/{accountId}/deviceAuth',
	AccountByDisplayName = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/displayName/{displayName}',
	AccountById = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
	BlockList = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/blocklist/{accountId}',
	Friends = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/friends/{accountId}',
	Levels = 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/query',
	Stats = 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/account/${accountId},',
	Timeline = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/calendar/v1/timeline',
	MCP = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/{accountId}/client/{operation}?profileId={profile}&rvn=-1'
}

/**
 * fortniteIOSGameClient in `clientId:secret` format and encoded in Base64
 */
const encodedClient = 'MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=';

const seasons = Array.from({
	length: 22 // Increment this value every season
}, (v, k) => k + 1).map(s => `s${s}_social_bp_level`).slice(10);

const postBody = (accessToken: string, body: BodyInit): RequestInit => ({
	method: 'post',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `bearer ${accessToken}`
	},
	body
});

const isError = (obj: any): obj is RawEpicError => 'errorCode' in obj;

export class EpicError extends Error {
	constructor(error: RawEpicError) {
		super(error.errorMessage);
		Object.assign(this, error);
	}
}

const checkError = async <Res>(raw: Response): Promise<Res> => {
	const res = await raw.json() as Res | RawEpicError;
	if (isError(res)) {
		throw new EpicError(res);
	}
	return res;
};

export const getAccessToken = async (deviceAuth?: DeviceAuth): Promise<AccessTokenAndId> => {
	if (deviceAuth === undefined) deviceAuth = config.epicDeviceAuth.main;
	const res = await fetch(Endpoints.AccessToken, {
		method: 'post',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `basic ${encodedClient}`
		},
		body: new URLSearchParams({ ...deviceAuth })
	});
	const { access_token } = await checkError<AccessTokenResponse>(res);

	return {
		accessToken: access_token,
		accountId: deviceAuth.account_id
	};
};

export const epicFetch = async <Res = unknown>(url: string, init?: RequestInit) => {
	if (init === undefined) {
		const { accessToken } = await getAccessToken();
		init = {
			headers: {
				Authorization: `bearer ${accessToken}`
			}
		};
	}

	const res = await fetch(url, init);
	return checkError<Res>(res);
};

/**
 * Get a temporary access token using device auth
 *
 * @remarks
 *
 * You must be logged in to the same Epic account at {@link https://www.epicgames.com} as the accountName
 *
 * @param accountName - The Epic account username
 * @param authorizationCode - The code obtained from {@link https://www.epicgames.com/id/api/redirect?clientId=3446cd72694c4a4485d81b77adbb2141&responseType=code here}
 * @returns Device auth credentials
 */
export const getDeviceAuth = async (accountName: string, authorizationCode: string): Promise<DeviceAuth> => {
	const stats = await fortniteAPI.stats({ name: accountName });
	const accountId = stats.account.id;

	const { access_token } = await epicFetch<AuthorizationCodeResponse>(Endpoints.AccessToken, {
		method: 'post',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `basic ${encodedClient}`
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code: authorizationCode
		})
	});

	const { deviceId, secret } = await epicFetch<DeviceAuthResponse>(Endpoints.DeviceAuth.replace('{accountId}', accountId), {
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

export const getAccount = async (nameOrId: string | string[], isId = false) => {
	const namesOrIds = [nameOrId].flat();

	let ids: string[] = [];
	if (!isId) {
		for (const displayName of namesOrIds) {
			const res = await epicFetch<EpicAccount>(Endpoints.AccountByDisplayName.replace('{displayName}', displayName));
			ids.push(res.id);
		}
	}
	else {
		ids = namesOrIds;
	}

	return epicFetch<EpicAccount[]>(`${Endpoints.AccountById}?accountId=${ids.join('&accountId=')}`);
};

export const getBlockList = (accountId: string) => epicFetch<BlockList>(Endpoints.BlockList.replace('{accountId}', accountId));

export const getFriends = (accountId: string) => epicFetch<Friend[]>(Endpoints.Friends.replace('{accountId}', accountId));

export const getLevels = async (accountId: string, accessToken?: string) => {
	if (accessToken === undefined) {
		const accessTokenAndId = await getAccessToken();
		accessToken = accessTokenAndId.accessToken;
	}

	const levels = await epicFetch<Stats[]>(
		Endpoints.Levels,
		postBody(accessToken, JSON.stringify({
			appId: 'fortnite',
			startDate: 0,
			endDate: 0,
			owners: [accountId],
			stats: seasons
		}))
	);

	return levels[0].stats;
};

export const getStats = (accountId: string) => epicFetch<Stats>(Endpoints.Stats.replace('{accountId}', accountId)).then(r => r.stats);

export const getTimeline = () => epicFetch(Endpoints.Timeline);

export const mcpRequest = async (operation: string, profile: 'common_public' | 'athena' | 'campaign', payload: Record<string, string> = {}) => {
	const accessTokenAndId = await getAccessToken();

	return epicFetch(
		Endpoints.MCP
			.replace('{accountId}', accessTokenAndId.accountId)
			.replace('{operation}', operation)
			.replace('{profile}', profile),
		postBody(accessTokenAndId.accessToken, JSON.stringify(payload))
	);
};

export const claimLoginReward = () => mcpRequest('ClaimLoginReward', 'campaign');

export const setHomebaseName = (homebaseName: string) => mcpRequest('SetHomebaseName', 'common_public', { homebaseName });