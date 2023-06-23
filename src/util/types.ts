import type { DeviceAuthGrant } from '@squiddleton/epic';
import type { DateString } from '@squiddleton/fortnite-api';
import type { ApplicationCommandOptionChoiceData, ButtonBuilder, ChatInputCommandInteraction, ComponentType, GuildBasedChannel, MessageContextMenuCommandInteraction, Snowflake, TextBasedChannel, User } from 'discord.js';

export type AnyGuildTextChannel = GuildBasedChannel & TextBasedChannel;

export type AnyObject = Record<string, unknown>;

export interface BlockList {
	blockedUsers: string[];
}

export type ButtonOrMenu = ComponentType.Button | ComponentType.StringSelect;

export interface Config {
	/** The Discord bot token */
	token: string;
	/** Device authentications for multiple devices/accounts */
	epicDeviceAuth: {
		device1: DeviceAuthGrant;
		device2: DeviceAuthGrant;
		alt?: DeviceAuthGrant;
	};
	/** A key for Fortnite-API.com */
	fortniteAPIKey: string;
	/** An Imgur client id */
	imgurClientId: string;
	/** The MongoDB path to connect to */
	mongoPath: string;
}

export interface DisplayUserProperties {
	id: Snowflake;
	username: string;
	color: number;
	avatar: string;
	same: boolean;
}

export interface EpicAccount {
	id: string;
	displayName?: string;
	passwordResetRequired?: boolean;
	links?: AnyObject;
	displayNameType?: string;
	externalAuths: Record<string, AnyObject>;
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
	epicAccountId: string | null;
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
	Pickaxe?: string;
	Glider?: string;
	Wrap?: string;
}

export type Link = keyof Links;

export type Dimensions = { [K in Link]: [number, number, number, number] };

export type PaginationButtons = [ButtonBuilder, ButtonBuilder, ButtonBuilder, ButtonBuilder, ButtonBuilder];

export type SlashOrMessageContextMenu = ChatInputCommandInteraction<'cached'> | MessageContextMenuCommandInteraction<'cached'>;

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