import fetch, { RequestInit } from 'node-fetch';
import config from '../config.js';
import FortniteAPI from '../clients/fortnite.js';
import { DateString } from '@squiddleton/fortnite-api';

/**
 * fortniteIOSGameClient in `clientId:secret` format and encoded in Base64
 */
const encodedClient = 'MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=';

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

const epicFetch = async <Response = unknown>(url: string, init: RequestInit) => {
	const res = await fetch(url, init).then(r => r.json()) as Response | RawEpicError;
	if (isError(res)) {
		throw new EpicError(res);
	}
	return res;
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

	const { access_token } = await epicFetch<AuthorizationCodeResponse>('https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token', {
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

	const { deviceId, secret } = await epicFetch<DeviceAuthResponse>(`https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${accountId}/deviceAuth`, {
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

export const getAccessToken = async (deviceAuth?: DeviceAuth): Promise<AccessTokenAndId> => {
	if (deviceAuth === undefined) deviceAuth = config.epicDeviceAuth.main;
	const { access_token } = await epicFetch<AccessTokenResponse>('https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token', {
		method: 'post',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `basic ${encodedClient}`
		},
		body: new URLSearchParams({ ...deviceAuth })
	});

	return {
		accessToken: access_token as string,
		accountId: deviceAuth.account_id
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
			const res = await epicFetch<EpicAccount>(`https://account-public-service-prod.ol.epicgames.com/account/api/public/account/displayName/${displayName}`, init);
			ids.push(res.id);
		}
	}
	else {
		ids = namesOrIds;
	}

	return epicFetch<EpicAccount>(`https://account-public-service-prod.ol.epicgames.com/account/api/public/account?accountId=${ids.join('&accountId=')}`, init);
};

export const changeHomebaseName = async (accessTokenAndId: AccessTokenAndId, newHomebaseName: string) => epicFetch(
	`https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/${accessTokenAndId.accountId}/client/SetHomebaseName?profileId=common_public&rvn=1`,
	{
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `bearer ${accessTokenAndId.accessToken}`
		},
		body: JSON.stringify({
			homebaseName: newHomebaseName
		})
	}
);