import type { DeviceAuthGrant } from '@squiddleton/epic';
import type { DateString } from '@squiddleton/fortnite-api';
import type { ApplicationCommandOptionChoiceData, ButtonBuilder, ChatInputCommandInteraction, ComponentType, GuildBasedChannel, MessageContextMenuCommandInteraction, Snowflake, TextBasedChannel, User } from 'discord.js';
import type { HydratedDocument } from 'mongoose';
import { type RankedTrack } from './constants.js';

export type AnyGuildTextChannel = GuildBasedChannel & TextBasedChannel;

export type AnyObject = Record<string, unknown>;

export type ButtonOrMenu = ComponentType.Button | ComponentType.StringSelect;

export interface Config {
	/** The Discord bot token */
	token: string;
	/** The Epic Games device auth grant */
	epicDeviceAuth: DeviceAuthGrant;
	/** A key for Fortnite-API.com */
	fortniteAPIKey: string;
	/** The MongoDB path to connect to */
	mongoPath: string;
	sentryDSN: string;
}

export interface DisplayUserProperties {
	id: Snowflake;
	name: string;
	color: number;
	avatar: string;
	same: boolean;
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
	bonusRoles: IBonusRole[];
	winnerNumber: number;
	entrants: Snowflake[];
	winners: Snowflake[];
}

export interface IGuild {
	_id: Snowflake;
	giveaways: IGiveaway[];
	milestones: IMilestone[];
	shopChannelId: Snowflake | null;
	shopSectionsChannelId: Snowflake | null;
	wishlistChannelId: Snowflake | null;
}

export interface IMember {
	userId: Snowflake;
	guildId: Snowflake;
	milestones: string[];
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

export type UserDocument = HydratedDocument<IUser>;

export interface LevelCommandOptions {
	targetUser: User;
	accountName: string | null;
	accountType: 'epic' | 'xbl' | 'psn';
}

export type CosmeticDisplayType = 'Outfit' | 'Back Bling' | 'Pickaxe' | 'Glider' | 'Wrap';

export type Links = Partial<Record<CosmeticDisplayType, string>>;

export type Dimensions = Record<CosmeticDisplayType, [number, number, number, number]>;

export type PaginationButtons = [ButtonBuilder, ButtonBuilder, ButtonBuilder, ButtonBuilder, ButtonBuilder];

export type SlashOrMessageContextMenu = ChatInputCommandInteraction<'raw' | 'cached'> | MessageContextMenuCommandInteraction<'raw' | 'cached'>;

export type CachedSlashOrMessageContextMenu = ChatInputCommandInteraction<'cached'> | MessageContextMenuCommandInteraction<'cached'>;

export interface StatsCommandOptions extends LevelCommandOptions {
	content?: string;
	input: 'all' | 'keyboardMouse' | 'gamepad' | 'touch';
	timeWindow: 'lifetime' | 'season';
}

export type StringChoices = ApplicationCommandOptionChoiceData<string>[];

export type StringOption = string | null;

export interface STWPublicProfile {
	profileChanges: {
		profile: {
			items: {
				templateId: string;
				attributes: {
					quest_state: string;
					last_state_change_time: string;
				};
			}[];
		};
	}[];
}

export interface STWProgress {
	accountId: string;
	active: boolean;
	template: string;
	completion: number;
	questName: string;
	max: number;
	increment: number;
	updatedAt: string;
}

export interface STWTrackedAccount {
	id: string;
	name: string;
	progress: STWProgress[] | null;
}

export interface TrackedMode {
	trackguid: RankedTrack;
	displayName: string;
}

export interface TrackedUser {
	displayUsername: string;
	trackedModes: TrackedMode[];
}

export interface WorldInfo {
	missionAlerts: {
		availableMissionAlerts: {
			missionAlertRewards: {
				items: {
					itemType: string;
					quantity: number;
				}[];
			};
		}[];
	}[];
}