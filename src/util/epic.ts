import fetch, { RequestInit, Response } from 'node-fetch';
import config from '../config.js';
import FortniteAPI from '../clients/fortnite.js';
import { DateString } from '@squiddleton/fortnite-api';

enum Endpoints {
	AccessToken = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
	DeviceAuth = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/{accountId}/deviceAuth',
	AccountByDisplayName = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/displayName/{displayName}',
	AccountById = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
	BlockList = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/blocklist/{accountId}',
	Friends = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/friends/{accountId}',
	Timeline = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/calendar/v1/timeline',
	MCP = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/{accountId}/client/{operation}?profileId={profile}&rvn=-1'
}

/**
 * fortniteIOSGameClient in `clientId:secret` format and encoded in Base64
 */
const encodedClient = 'MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=';

type Profile = 'common_public' | 'athena' | 'campaign';

type AnyObject = Record<string, unknown>;

interface RawEpicError {
	errorCode: string;
	errorMessage: string;
	messageVars: string[];
	numericErrorCode: number;
	originatingService: string;
	intent: string;
}

class EpicError extends Error {
	constructor(error: RawEpicError) {
		super(error.errorMessage);
		Object.assign(this, error);
	}
}

const isError = (obj: any): obj is RawEpicError => 'errorCode' in obj;

interface AccessTokenResponse {
	access_token: string;
	expires_in: number;
	expires_at: DateString;
	token_type: string;
	refresh_token: string;
	refresh_expires: number;
	refresh_expires_at: DateString;
	account_id: string;
	client_id: string;
	internal_client: boolean;
	client_service: string;
	displayName: string;
	app: string;
	in_app_id: string;
	device_id: string;
}

interface AuthorizationCodeResponse extends AccessTokenResponse {
	scope: unknown[];
	ext_auth_id: string;
	ext_auth_type: string;
	ext_auth_method: string;
	ext_auth_display_name: string;
}

interface DeviceAuthResponse {
	deviceId: string;
	accountId: string;
	secret: string;
	userAgent: string;
	created: {
		location: string;
		ipAddress: string;
		dateTime: DateString;
	};
}

interface DeviceAuth {
	grant_type: 'device_auth';
	account_id: string;
	device_id: string;
	secret: string;
}

interface AccessTokenAndId {
	accessToken: string;
	accountId: string;
}

interface EpicAccount {
	id: string;
	displayName: string;
	passwordResetRequired?: boolean;
	links?: AnyObject;
	externalAuths: Record<string, AnyObject>;
}

interface BlockList {
	blockedUsers: string[];
}

interface Friend {
	accountId: string;
	status: string;
	direction: string;
	alias?: string;
	created: DateString;
	favorite: boolean;
}

const checkError = async <Res = unknown>(raw: Response): Promise<Res> => {
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
	const stats = await FortniteAPI.stats({ name: accountName });
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
		secret: secret
	};
};

export const getAccount = async (accessToken: string, nameOrId: string | string[], isId = false) => {
	const namesOrIds = [nameOrId].flat();
	const init = {
		headers: {
			Authorization: `bearer ${accessToken}`
		}
	};

	let ids: string[] = [];
	if (!isId) {
		for (const displayName of namesOrIds) {
			const res = await epicFetch<EpicAccount>(Endpoints.AccountByDisplayName.replace('displayName', displayName), init);
			ids.push(res.id);
		}
	}
	else {
		ids = namesOrIds;
	}

	return epicFetch<EpicAccount>(`${Endpoints.AccountById}?accountId=${ids.join('&accountId=')}`, init);
};

export const getBlockList = async (accountId: string, init?: RequestInit) => epicFetch<BlockList>(Endpoints.BlockList.replace('{accountId}', accountId), init);

export const getFriends = async (accountId: string, init?: RequestInit) => epicFetch<Friend[]>(Endpoints.Friends.replace('{accountId}', accountId), init);

export const getTimeline = async (init?: RequestInit) => epicFetch(Endpoints.Timeline, init);

export const mcpRequest = async (accessTokenAndId: AccessTokenAndId, operation: string, profile: Profile, payload: Record<string, string> = {}) => epicFetch(
	Endpoints.MCP
		.replace('{accountId}', accessTokenAndId.accountId)
		.replace('{operation}', operation)
		.replace('{profile}', profile),
	{
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `bearer ${accessTokenAndId.accessToken}`
		},
		body: JSON.stringify(payload)
	}
);

export const claimLoginReward = async (accessTokenAndId?: AccessTokenAndId) => {
	if (accessTokenAndId === undefined) accessTokenAndId = await getAccessToken();
	return mcpRequest(accessTokenAndId, 'ClaimLoginReward', 'campaign');
};

export const setHomebaseName = async (homebaseName: string, accessTokenAndId?: AccessTokenAndId) => {
	if (accessTokenAndId === undefined) accessTokenAndId = await getAccessToken();
	return mcpRequest(accessTokenAndId, 'SetHomebaseName', 'common_public', { homebaseName });
};