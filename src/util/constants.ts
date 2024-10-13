import { getEnumKeys } from '@squiddleton/util';
import { type ApplicationCommandOptionAllowedChannelTypes, type ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js';
import type { StringChoices } from './types.js';

export const AccessibleChannelPermissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];

export enum BackgroundURL {
	Gold = './assets/backgrounds/gold.jpg',
	Orange = './assets/backgrounds/orange.jpg',
	Purple = './assets/backgrounds/purple.jpg',
	Blue = './assets/backgrounds/blue.jpg',
	Green = './assets/backgrounds/green.jpg'
}

export const BackgroundChoices: StringChoices = getEnumKeys(BackgroundURL).map(b => ({ name: b, value: b }));

export const ChapterLengths = [10, 8, 4, 4, 1, 4];

export namespace DiscordIds {
	export enum ChannelId {
		Dev = '863882874519814154',
		ShopPosts = '489836390759268353',
		UserCommands = '742803449493717134'
	}
	export enum CommandId {
		Link = '1032454252024565821',
		Settings = '1001289651862118471',
		Wishlist = '1000092959875793080'
	}
	export enum GuildId {
		Dev = '614918461453238357',
		Exclusive = '741099538269339738'
	}
	export enum MessageId {
		CommandList = '1064964139094650971'
	}
	export enum RoleId {
		ItemShop = '568590143640961037'
	}
	export enum UserId {
		Catalyst = '848452706791981056',
		Lexxy = '1063569119506608249'
	}
}

export const divisionNames = ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 'Gold I', 'Gold II', 'Gold III', 'Platinum I', 'Platinum II', 'Platinum III', 'Diamond I', 'Diamond II', 'Diamond III', 'Elite', 'Champion', 'Unreal'];

/**
 * fortniteIOSGameClient in `clientId:secret` format and encoded in Base64
 */
export const EncodedClient = 'MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=';

export enum EpicEndpoint {
	AccessToken = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
	AccountByDisplayName = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/displayName/{displayName}',
	AccountById = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
	BlockList = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/blocklist/{accountId}',
	DeviceAuth = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/{accountId}/deviceAuth',
	Friends = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/friends/{accountId}',
	ItemShop = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/storefront/v2/catalog',
	Levels = 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/query',
	MCP = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/{accountId}/client/{operation}?profileId={profile}&rvn=-1',
	Stats = 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/account/{accountId},',
	Timeline = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/calendar/v1/timeline',
	Website = 'https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game?lang=en-US'
}

export enum ErrorMessage {
	FalseTypeguard = 'The value "{value}" did not satisfy the typeguard',
	InvisibleChannel = 'The Client is missing the View Channel permission in the channel "{channelId}"',
	MissingPermissions = 'The Client is missing its required permissions in the channel "{channelId}"',
	NotUserOwned = 'The Client application is not owned by a User instance',
	OutOfGuild = 'This command should only be usable in (cached) guilds',
	UncachedClient = 'The Client user is not cached',
	UnexpectedValue = 'The value "{value}" was unexpected',
	UnknownGiveaway = 'No giveaway was found with that message id',
	UnreadyClient = 'The Client should be ready but is not'
}

export const LanguageChoices: StringChoices = Object.entries({
	'ar': 'اَلْعَرَبِيَّةُ',
	'de': 'Deutsch',
	'en': 'English',
	'es': 'Español',
	'es-419': 'Español (América Latina)',
	'fr': 'Français',
	'it': 'Italiano',
	'ja': '日本語',
	'ko': '한국어',
	'pl': 'Język Polski',
	'pt-BR': 'Português',
	'ru': 'Русский язык',
	'tr': 'Türkçe',
	'zh-CN': '官话',
	'zh-Hant': '官話'
}).map(([k, v]) => ({ name: v, value: k }));

export const LoadoutImageOptions: ApplicationCommandOptionData[] = [
	{
		name: 'outfit',
		description: 'Any outfit in the game\'s files',
		type: ApplicationCommandOptionType.String,
		autocomplete: true
	},
	{
		name: 'backbling',
		description: 'Any back bling in the game\'s files',
		type: ApplicationCommandOptionType.String,
		autocomplete: true
	},
	{
		name: 'pickaxe',
		description: 'Any pickaxe in the game\'s files',
		type: ApplicationCommandOptionType.String,
		autocomplete: true
	},
	{
		name: 'glider',
		description: 'Any glider in the game\'s files',
		type: ApplicationCommandOptionType.String,
		autocomplete: true
	},
	{
		name: 'wrap',
		description: 'Any wrap in the game\'s files',
		type: ApplicationCommandOptionType.String,
		autocomplete: true
	},
	{
		name: 'background',
		description: 'Select a specific background color',
		type: ApplicationCommandOptionType.String,
		choices: BackgroundChoices
	}
];

export const PlatformChoices: StringChoices = [
	{ name: 'Epic', value: 'epic' },
	{ name: 'Xbox', value: 'xbl' },
	{ name: 'PlayStation', value: 'psn' }
];

export enum RankedTrack {
	S0PBR = '2776dc',
	S0PZB = '9d7ebd',
	S0BR = 'ggOwuK',
	S0ZB = 'AjRdrb',
	C4S4BR = 'gXffl',
	C4S4ZB = 'yHNFu',
	OGBR = 'OiK9k9',
	OGZB = 'hEKWqj',
	C5S1BR = 'EYpme7',
	C5S1ZB = 'd0zEcd',
	S0Racing = 'dmd372',
	C5S2BR = 'ch3353',
	C5S2ZB = 'a1m0n3',
	NeonRushRacing = 'rrwpwg',
	C5S3BR = 'N4PK1N',
	C5S3ZB = 'L1GHT5',
	InfernoIslandRacing = 'rrzuel',
	C5S4BR = 'S4LT3D',
	C5S4ZB = 'P0T4T0',
	Reload1BR = 'M4rC4S',
	Reload1ZB = 'L4nC3r',
	C5S4Racing = 'rr9qlw'
}

export const RarityColors: Partial<Record<string, number>> = {
	'Common': 0xbebdb7,
	'Uncommon': 0x1edd1d,
	'Rare': 0x4e5afe,
	'Epic': 0xa745cf,
	'Legendary': 0xf76b11,
	'Mythic': 0xfadb4b,
	'Exotic': 0x7afff4,
	'Icon Series': 0x10626f,
	'MARVEL SERIES': 0x630303,
	'DC SERIES': 0x101b2a,
	'Star Wars Series': 0x000201,
	'DARK SERIES': 0x25053d,
	'Frozen Series': 0x93c3e0,
	'Lava Series': 0x7c2921,
	'Shadow Series': 0x0f0f0f,
	'Slurp Series': 0x1ac1a4,
	'Gaming Legends Series': 0x1f0937
};

export enum RarityOrdering {
	Common,
	Uncommon,
	Rare,
	Epic,
	Legendary,
	Mythic
}

export const Rarities = getEnumKeys(RarityOrdering);

export const TextBasedChannelTypes = [ChannelType.GuildAnnouncement, ChannelType.GuildText, ChannelType.GuildVoice] as const satisfies ApplicationCommandOptionAllowedChannelTypes[];

export enum Time {
	/** 3 minutes */
	CollectorDefault = 180000,
	/** 1 hour */
	CosmeticCacheUpdate = 3600000,
	/** 1 minute */
	GuessCollector = 60000
}

export enum UnitsToMS {
	Minutes = 60,
	Hours = 3600,
	Days = 86400
}

export const UnitChoices: StringChoices = getEnumKeys(UnitsToMS).map(u => ({ name: u, value: u }));