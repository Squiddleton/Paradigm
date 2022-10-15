import type { Cosmetic, DateString } from '@squiddleton/fortnite-api';
import type { ApplicationCommandOptionChoiceData, ChatInputCommandInteraction, DMChannel, MessageContextMenuCommandInteraction, PartialDMChannel, Snowflake, TextBasedChannel, User } from 'discord.js';
import type { EpicErrorCode } from './constants';

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

export type AnyGuildTextChannel = Exclude<TextBasedChannel, DMChannel | PartialDMChannel>;

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
	/** The channel to access with Client#devChannel */
	devChannelId: Snowflake;
	/** The guild to deploy all commands */
	devGuildId: Snowflake;
	/** The guild to deploy all commands with the "Exclusive" scope */
	exclusiveGuildId: Snowflake;
	epicDeviceAuth: {
		device1: DeviceAuth;
		device2: DeviceAuth;
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

export interface CosmeticCache {
	cosmetics: Cosmetic[];
	lastUpdatedTimestamp: number;
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

export interface Friend {
	accountId: string;
	status: string;
	direction: string;
	alias?: string;
	created: DateString;
	favorite: boolean;
}

export interface IBonusRole {
	id: Snowflake;
	amount: number;
}

export interface IGiveaway {
	messageId: Snowflake;
	channelId: Snowflake;
	text: string;
	startTime: number;
	endTime: number;
	completed: boolean;
	messages: number;
	bonusRoles: IBonusRole[];
	winnerNumber: number;
	entrants: Snowflake[];
	winners: Snowflake[];
}

export interface IGuild {
	_id: Snowflake;
	giveaways: IGiveaway[];
	milestones: IMilestone[];
	wishlistChannelId: Snowflake | null;
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

export interface LevelCommandOptions {
	targetUser: User;
	accountName: string | null;
	accountType: 'epic' | 'xbl' | 'psn';
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

export type SlashOrMessageContextMenu = ChatInputCommandInteraction | MessageContextMenuCommandInteraction;

export interface Stats {
	startTime: number;
	endTime: number;
	stats: Record<string, number>;
	accountId: string;
}

export interface StatsCommandOptions extends LevelCommandOptions {
	input: 'all' | 'keyboardMouse' | 'gamepad' | 'touch';
	timeWindow: 'lifetime' | 'season';
}

export type StringChoices = ApplicationCommandOptionChoiceData<string>[];

export type StringOption = string | null;