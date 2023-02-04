import fortniteAPI from '../clients/fortnite.js';
import config from '../config.js';
import { EpicError } from './classes.js';
import { EncodedClient, EpicEndpoint, Seasons } from './constants.js';
import type { AuthorizationCodeAccessTokenResponse, BlockList, DeviceAuth, DeviceAuthAccessTokenResponse, DeviceAuthResponse, EpicAccount, Friend, RawEpicError, RefreshTokenAccessTokenResponse, RefreshTokenBody, Stats } from './types.js';

const checkError = async <Res>(res: Response) => {
	if (!res.ok) throw new Error(`Unexpected Epic response status: [${res.status}] ${res.statusText}`);
	const json: Res | RawEpicError = await res.json();
	if (EpicError.isRawEpicError(json)) {
		throw new EpicError(json);
	}
	return json;
};

const postBody = (accessToken: string, body: BodyInit): RequestInit => ({
	method: 'post',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `bearer ${accessToken}`
	},
	body
});

export function getAccessToken(body: RefreshTokenBody): Promise<RefreshTokenAccessTokenResponse>;
export function getAccessToken(body?: DeviceAuth): Promise<DeviceAuthAccessTokenResponse>;
export async function getAccessToken(body: RefreshTokenBody | DeviceAuth = config.epicDeviceAuth.device1) {
	const res = await fetch(
		EpicEndpoint.AccessToken,
		{
			method: 'post',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `basic ${EncodedClient}`
			},
			body: new URLSearchParams({ ...body })
		}
	);
	if (!res.ok) throw new Error(`Unexpected Epic response status: [${res.status}] ${res.statusText}`);
	return res.json();
}

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

export const getBlockList = (accountId: string) => epicFetch<BlockList>(EpicEndpoint.BlockList.replace('{accountId}', accountId));

export const getFriends = (accountId: string) => epicFetch<Friend[]>(EpicEndpoint.Friends.replace('{accountId}', accountId));

export const getLevels = async (accountId: string, accessToken?: string) => {
	if (accessToken === undefined) {
		const { access_token } = await getAccessToken();
		accessToken = access_token;
	}

	const [levels] = await epicFetch<Stats[]>(
		EpicEndpoint.Levels,
		postBody(accessToken, JSON.stringify({
			appId: 'fortnite',
			startDate: 0,
			endDate: 0,
			owners: [accountId],
			stats: Seasons
		}))
	);

	return levels.stats;
};

export const getStats = (accountId: string) => epicFetch<Stats>(EpicEndpoint.Stats.replace('{accountId}', accountId)).then(r => r.stats);

export const getTimeline = () => epicFetch(EpicEndpoint.Timeline);

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

export const claimLoginReward = () => mcpRequest('ClaimLoginReward', 'campaign');

export const setHomebaseName = (homebaseName: string) => mcpRequest('SetHomebaseName', 'common_public', { homebaseName });