import { ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, ColorResolvable, PermissionFlagsBits, PermissionResolvable } from 'discord.js';
import type { StringChoices } from './types';

export const AccessibleChannelPermissions: PermissionResolvable[] = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];

export enum BackgroundURL {
	Gold = 'https://cdn.discordapp.com/attachments/713250274214543360/828073686870392842/gold.jpg',
	Orange = 'https://cdn.discordapp.com/attachments/713250274214543360/828073689752141874/orange.jpg',
	Purple = 'https://cdn.discordapp.com/attachments/713250274214543360/828073688834113566/purple.jpg',
	Blue = 'https://cdn.discordapp.com/attachments/713250274214543360/828073694717804584/blue.jpg',
	Green = 'https://cdn.discordapp.com/attachments/713250274214543360/828073688074289172/green.jpg'
}

export const BackgroundChoices: StringChoices = Object.keys(BackgroundURL).map(background => ({ name: background, value: background }));

export const BorisAlbumIds = ['l5t1sa4', 'Mwq1cMR', 'SIDS0Rx', 'h9QexoV', '1duqrpv', 'iLt9Ija'];

export const ChapterLengths = [10, 8];

/**
 * 60 minutes * (60 seconds / minute) * (1,000 milliseconds / second)
 */
export const CosmeticCacheUpdateThreshold = 3600000;

/**
 * fortniteIOSGameClient in `clientId:secret` format and encoded in Base64
 */
export const EncodedClient = 'MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=';

export enum EpicEndpoint {
	AccessToken = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
	DeviceAuth = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/{accountId}/deviceAuth',
	AccountByDisplayName = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/displayName/{displayName}',
	AccountById = 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
	BlockList = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/blocklist/{accountId}',
	Friends = 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/friends/{accountId}',
	Levels = 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/query',
	Stats = 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2/account/${accountId},',
	Timeline = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/calendar/v1/timeline',
	MCP = 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile/{accountId}/client/{operation}?profileId={profile}&rvn=-1'
}

export enum EpicErrorCode {
	INVALID_GRANT = 18031
}

export enum ErrorMessage {
	FalseTypeguard = 'The value "{value}" did not satisfy the typeguard',
	InvisibleChannel = 'The Client is missing the View Channel permission in the channel "{channelId}"',
	MissingPermissions = 'The Client is missing its required permissions in the channel "{channelId}"',
	NotUserOwned = 'The Client application is not owned by a User instance',
	OutOfGuild = 'This command should only be usable in (cached) guilds',
	UncachedClient = 'The Client user is not cached',
	UnexpectedValue = 'The value {value} was unexpected',
	UnreadyClient = 'The Client should be ready but is not'
}

export const LanguageChoices: StringChoices = Object.entries({
	ar: 'اَلْعَرَبِيَّةُ',
	de: 'Deutsch',
	en: 'English',
	es: 'Español',
	'es-419': 'Español (América Latina)',
	fr: 'Français',
	it: 'Italiano',
	ja: '日本語',
	ko: '한국어',
	pl: 'Język Polski',
	'pt-BR': 'Português',
	ru: 'Русский язык',
	tr: 'Türkçe',
	'zh-CN': '官话',
	'zh-Hant': '官話'
}).map(([key, value]) => ({ name: value, value: key }));

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
		name: 'harvestingtool',
		description: 'Any harvesting tool in the game\'s files',
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

export const RarityColors: Record<string, ColorResolvable> = {
	Common: 0xbebdb7,
	Uncommon: 0x1edd1d,
	Rare: 0x4e5afe,
	Epic: 0xa745cf,
	Legendary: 0xf76b11,
	Mythic: 0xfadb4b,
	Exotic: 0x7afff4,
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

export const Rarities = Object.keys(RarityOrdering);

export const Seasons = Array.from({
	length: 22 // Increment this value every season
}, (v, k) => k + 1).map(s => `s${s}_social_bp_level`).slice(10);

export const TextBasedChannelTypes = [ChannelType.GuildAnnouncement, ChannelType.GuildText, ChannelType.GuildVoice];

export enum UnitsToMS {
	Minutes = 60,
	Hours = 3600,
	Days = 86400
}

export const UnitChoices: StringChoices = Object.keys(UnitsToMS).map(unit => ({ name: unit, value: unit }));