import type { Cosmetic, DateString } from '@squiddleton/fortnite-api';
import type { ApplicationCommandOptionChoiceData, ButtonBuilder, ChatInputCommandInteraction, ComponentType, DMChannel, MessageContextMenuCommandInteraction, PartialDMChannel, Snowflake, TextBasedChannel, User } from 'discord.js';
import type { SnoowrapOptions } from 'snoowrap';
import type Twit from 'twit';
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

export type ButtonOrMenu = ComponentType.Button | ComponentType.SelectMenu;

export interface Config {
	/** The Discord bot token */
	token: string;
	/** The channel to access with Client#devChannel */
	devChannelId: Snowflake;
	/** The guild to deploy all commands */
	devGuildId: Snowflake;
	/** The guild to deploy all commands with the "Exclusive" scope */
	exclusiveGuildId: Snowflake;
	/** Device authentications for multiple devices/accounts */
	epicDeviceAuth: {
		device1: DeviceAuth;
		device2: DeviceAuth;
		alt?: DeviceAuth;
	};
	/** A key for Fortnite-API.com */
	fortniteAPIKey: string;
	/** An Imgur client id */
	imgurClientId: string;
	/** The MongoDB path to connect to */
	mongoPath: string;
	/** Options for a Snoowrap client construction */
	snoowrap: SnoowrapOptions;
	/** Options for a Twitter client construction */
	twitter: Twit.Options;
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

export type Template<T> = T & {
	_activeDate: DateString;
	lastModified: DateString;
	_locale: string;
	_templateName: string;
};

export interface SubgameInfo {
	image: string;
	color: string;
	_type: string;
	description: string;
	subgame: string;
	standardMessageLine2: string;
	title: string;
	standardMessageLine1: string;
}

export interface MOTD {
	hidden: boolean;
	_type: string;
	message: {
		entryType: string;
		image: string;
		titleImage: string;
		hidden: boolean;
		videoMute: boolean;
		_type: string;
		title: string;
		body: string;
		videoLoop: boolean;
		videoStreamingEnabled: boolean;
		id: string;
		videoAutoplay: boolean;
		videoFullscreen: boolean;
		spotlight: boolean;
	};
	platform: string;
}

export interface ShopSection {
	bSortOffersByOwnership: boolean;
	bShowIneligibleOffersIfGiftable: boolean;
	bEnableToastNotification: boolean;
	background: {
		stage: string;
		_type: string;
		key: string;
	};
	_type: string;
	landingPriority: number;
	bHidden: boolean;
	sectionId: string;
	bShowTimer: boolean;
	sectionDisplayName?: string;
	bShowIneligibleOffers: boolean;
}

export interface FortniteWebsite {
	_title: string;
	_activeDate: DateString;
	lastModified: DateString;
	_locale: string;
	_templateName: string;
	subgameinfo: Template<{
		battleroyale: SubgameInfo;
		savetheworld: SubgameInfo & { specialMessage: string };
		_title: string;
		_noIndex: boolean;
		creative: Omit<SubgameInfo, 'standardMessageLine2'>;
		_activeDate: DateString;
	}>;
	athenamessage: Template<{
		_title: string;
		overrideablemessage: {
			_type: string;
			message: {
				image: string;
				_type: string;
				title: string;
				body: string;
			};
		};
	}>;
	// There are MANY unlisted properties
	shopSections: Template<{
		_title: string;
		sectionList: {
			_type: string;
			sections: ShopSection[];
		};
		_noIndex: boolean;
	}>;
	// Many more unlisted properties beneath
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
	shopSectionsChannelId: Snowflake | null;
	wishlistChannelId: Snowflake | null;
}

export interface IMember {
	userId: Snowflake;
	guildId: Snowflake;
	dailyMessages: IMessage[];
	milestones: string[];
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
	_id: Snowflake;
	epicAccountId: string;
	wishlistCosmeticIds: string[];
}

export interface LevelCommandOptions {
	targetUser: User;
	accountName: string | null;
	accountType: 'epic' | 'xbl' | 'psn';
}

export interface Links {
	Outfit?: string;
	'Back Bling'?: string;
	'Harvesting Tool'?: string;
	Glider?: string;
}

export type Link = keyof Links;

export type Dimensions = { [K in Link]: [number, number, number, number] };

export type PaginationButtons = [ButtonBuilder, ButtonBuilder, ButtonBuilder, ButtonBuilder, ButtonBuilder];

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

export interface StatsEpicAccount {
	id: string;
	name: string;
}

export type StringChoices = ApplicationCommandOptionChoiceData<string>[];

export type StringOption = string | null;

export interface ChannelData<State> {
	states: State[];
	cacheExpire: DateString;
}

export interface ActiveEvent {
	eventType: string;
	activeUntil: DateString;
	activeSince: DateString;
}

export interface TimelineClientEvent {
	validFrom: DateString;
	activeEvents: ActiveEvent[];
	state: {
		activeStorefronts: unknown[];
		eventNamedWeights: unknown;
		activeEvents: unknown[];
		seasonNumber: number;
		seasonTemplateId: string;
		matchXpBonusPoints: number;
		eventPunchCardTemplateId: string;
		seasonBegin: DateString;
		seasonEnd: DateString;
		seasonDisplayedEnd: DateString;
		weeklyStoreEnd: DateString;
		stwEventStoreEnd: DateString;
		stwWeeklyStoreEnd: DateString;
		sectionStoreEnds: Record<string, DateString>;
		rmtPromotion: string;
		dailyStoreEnd: DateString;
	};
}

export interface Timeline {
	channels: {
		'standalone-store': ChannelData<unknown>;
		'client-matchmaking': ChannelData<unknown>;
		tk: ChannelData<unknown>;
		'featured-islands': ChannelData<unknown>;
		'community-votes': ChannelData<unknown>;
		'client-events': ChannelData<TimelineClientEvent>;
	};
	cacheIntervalMins: number;
	currentTime: DateString;
}