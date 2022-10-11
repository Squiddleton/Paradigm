import type { DateString } from '@squiddleton/fortnite-api';
import type { Snowflake } from 'discord.js';

export interface AccessTokenAndId {
	accessToken: string;
	accountId: string;
}

export interface AccessTokenResponse {
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

export interface AuthorizationCodeResponse extends AccessTokenResponse {
	scope: unknown[];
	ext_auth_id: string;
	ext_auth_type: string;
	ext_auth_method: string;
	ext_auth_display_name: string;
}

export type AnyObject = Record<string, unknown>;

export interface BlockList {
	blockedUsers: string[];
}

export interface Config {
	token: string;
	devChannelId: string;
	devGuildId: string;
	exclusiveGuildId: string;
	epicDeviceAuth: {
		main: DeviceAuth;
		alt?: DeviceAuth;
	};
	fortniteAPIKey: string;
	imgurClientId: string;
	mongoPath: string;
	snoowrap: {
		clientId: string;
		clientSecret: string;
		refreshToken: string;
		userAgent: string;
	};
}

export interface DisplayUserProperties {
	id: Snowflake;
	username: string;
	color: number;
	avatar: string;
	same: boolean;
}

export interface DeviceAuth {
	grant_type: 'device_auth';
	account_id: string;
	device_id: string;
	secret: string;
}

export interface DeviceAuthResponse {
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

export interface EpicAccount {
	id: string;
	displayName: string;
	passwordResetRequired?: boolean;
	links?: AnyObject;
	externalAuths: Record<string, AnyObject>;
}

export enum EpicErrorCode {
	INVALID_GRANT = 18031
}

export interface Friend {
	accountId: string;
	status: string;
	direction: string;
	alias?: string;
	created: DateString;
	favorite: boolean;
}

export interface IBonusRole {
	id: string;
	amount: number;
}

export interface IGiveaway {
	messageId: string;
	channelId: string;
	text: string;
	startTime: number;
	endTime: number;
	completed: boolean;
	messages: number;
	bonusRoles: IBonusRole[];
	winnerNumber: number;
	entrants: string[];
	winners: string[];
}

export interface IGuild {
	_id: string;
	giveaways: IGiveaway[];
	milestones: IMilestone[];
	wishlistChannelId: string | null;
}

export interface IMessage {
	day: number;
	messages: number;
}

export interface IMilestone {
	name: string;
	description: string;
	rarity: string;
}

export interface IUser {
	userId: Snowflake;
	guildId: Snowflake;
	messages: IMessage[];
}

export type Quantity = { [key: string]: number };

export interface RawEpicError {
	errorCode: string;
	errorMessage: string;
	messageVars: string[];
	numericErrorCode: EpicErrorCode | number;
	originatingService: string;
	intent: string;
	error_description?: string;
	error?: string;
}

export interface Stats {
	startTime: number;
	endTime: number;
	stats: Record<string, number>;
	accountId: string;
}

export type StringOption = string | null;