import { getEnumKeys } from '@squiddleton/util';
import { type ApplicationCommandOptionAllowedChannelTypes, type ApplicationCommandOptionChoiceData, type ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js';
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

export const ChapterLengths = [
	10, // Chapter 1
	8, // Chapter 2
	4, // Chapter 3
	4, // Chapter 4
	1, // OG
	4, // Chapter 5
	1, // Remix
	3 // Chapter 6
];

export namespace DiscordIds {
	export enum ChannelId {
		Dev = '863882874519814154',
		ShopPosts = '489836390759268353',
		UserCommands = '742803449493717134',
		RankedProgress = '1170469502136356874',
		STWTracking = '1310688486046564423'
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
		CommandList = '1064964139094650971',
		STWProgress = '1310693896942125098'
	}
	export enum RoleId {
		ItemShop = '568590143640961037',
		STW = '1308313483703615549'
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
	Website = 'https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game?lang=en-US',
	WorldInfo = 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2/world/info'
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

export const RankedEmojiIds = [
	'1297963362239516672', // Unknown
	'1297963226557841429', // Bronze I
	'1297963246896021514',
	'1297963262607888444',
	'1297963344472445058', // Silver I
	'1297963349954269206',
	'1297963356271018075',
	'1297963307214438400', // Gold I
	'1297963315548520589',
	'1297963319499690014',
	'1297963325417586708', // Platinum I
	'1297963331918757990',
	'1297963338466197554',
	'1297963279137898638', // Diamond I,
	'1297963286616084600',
	'1297963293171777597',
	'1297963300620992522', // Elite
	'1297963272171028542', // Champion
	'1297963368451281078' // Unreal
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
	S0ReloadBR = 'M4rC4S',
	S0ReloadZB = 'L4nC3r',
	Oct24Racing = 'rr9qlw',
	RemixBR = 'Fr3SkA',
	RemixZB = 'D13tDw',
	RemixReloadBR = 'P3PP3R',
	RemixReloadZB = 'W4FFL3',
	Dec24Racing = 'rrhr6d',
	C6S1BR = 'Gl4ss1',
	C6S1ZB = 'SP1D3R',
	BallisticS0 = 'G4RL1C',
	OGS0BR = 'M3M0RY',
	OGS0ZB = 'DR3AM5',
	OGS2BR = 'RU5T3D',
	OGS2ZB = 'G0LD3N',
	S2ReloadBR = 'SUG4R',
	S2ReloadZB = 'SP1C3',
	Feb25Racing = 'rr36y9',
	C6S2BR = 'S4ngu1',
	C6S2ZB = 'vidr1o',
	GetawayBR = '8R1GHT',
	GetawayZB = 'GL055Y',
	OGS3BR = 'D3F3AT',
	OGS3ZB = 'D3F3ND',
	BallisticRAndDS1 = 'H4B1T5',
	S3ReloadBR = 'QU3ST',
	S3ReloadZB = 'L3GND',
	GalacticBattleBR = 'Pr1c3s',
	GalacticBattleZB = 'C4m1s4',
	May25Racing = 'rrg9wp'
}

export enum RankingType {
	BattleRoyale = 'ranked-br',
	ZeroBuild = 'ranked-zb',
	OGBuild = 'ranked-figment-build',
	OGNoBuild = 'ranked-figment-nobuild',
	ReloadBuild = 'ranked_blastberry_build',
	ReloadNoBuild = 'ranked_blastberry_nobuild',
	Ballistic = 'ranked-feral',
	RocketRacing = 'delmar-competitive'
}

export const RankingTypeDisplayNames: Record<RankingType, string> = {
	[RankingType.BattleRoyale]: 'Battle Royale',
	[RankingType.ZeroBuild]: 'Zero Build',
	[RankingType.OGBuild]: 'OG (Build)',
	[RankingType.OGNoBuild]: 'OG (Zero Build)',
	[RankingType.ReloadBuild]: 'Reload (Build)',
	[RankingType.ReloadNoBuild]: 'Reload (Zero Build)',
	[RankingType.Ballistic]: 'Ballistic',
	[RankingType.RocketRacing]: 'Rocket Racing'
};

export const RankingTypeChoices: ApplicationCommandOptionChoiceData<string>[] = [
	{ name: RankingTypeDisplayNames[RankingType.BattleRoyale], value: RankingType.BattleRoyale },
	{ name: RankingTypeDisplayNames[RankingType.ZeroBuild], value: RankingType.ZeroBuild },
	{ name: RankingTypeDisplayNames[RankingType.OGBuild], value: RankingType.OGBuild },
	{ name: RankingTypeDisplayNames[RankingType.OGNoBuild], value: RankingType.OGNoBuild },
	{ name: RankingTypeDisplayNames[RankingType.ReloadBuild], value: RankingType.ReloadBuild },
	{ name: RankingTypeDisplayNames[RankingType.ReloadNoBuild], value: RankingType.ReloadNoBuild },
	{ name: RankingTypeDisplayNames[RankingType.Ballistic], value: RankingType.Ballistic },
	{ name: RankingTypeDisplayNames[RankingType.RocketRacing], value: RankingType.RocketRacing }
] satisfies { name: string; value: RankingType }[];

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