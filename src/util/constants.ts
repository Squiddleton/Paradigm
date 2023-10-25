import { getEnumKeys } from '@squiddleton/util';
import { type ApplicationCommandOptionAllowedChannelTypes, type ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, PermissionFlagsBits, type TextBasedChannel } from 'discord.js';
import type { StringChoices } from './types.js';

export const AccessibleChannelPermissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];

export enum BackgroundURL {
	Gold = 'https://cdn.discordapp.com/attachments/713250274214543360/828073686870392842/gold.jpg',
	Orange = 'https://cdn.discordapp.com/attachments/713250274214543360/828073689752141874/orange.jpg',
	Purple = 'https://cdn.discordapp.com/attachments/713250274214543360/828073688834113566/purple.jpg',
	Blue = 'https://cdn.discordapp.com/attachments/713250274214543360/828073694717804584/blue.jpg',
	Green = 'https://cdn.discordapp.com/attachments/713250274214543360/828073688074289172/green.jpg'
}

export const BackgroundChoices: StringChoices = getEnumKeys(BackgroundURL).map(b => ({ name: b, value: b }));

export const BorisAlbumIds = ['l5t1sa4', 'Mwq1cMR', 'SIDS0Rx', 'h9QexoV', '1duqrpv', 'iLt9Ija'];

export const ChapterLengths = [10, 8, 4];

export namespace DiscordIds {
	export enum ChannelId {
		BRLeaks = '509930374021775394',
		BRSpeculation = '785210975733284915',
		Dev = '863882874519814154',
		General = '488040333310164992',
		LeakPosts = '819870118720438273',
		LeaksDiscussion = '509936143169748992',
		Logs = '488112900276224010',
		RegularApplications = '886083204690370630',
		RoleAssignment = '879930518228050010',
		SaltySprings = '488988723049136133',
		ShopPosts = '489836390759268353',
		StickerEmojiSubmissions = '895024792439251064',
		STWCreativeLeaks = '740607796898168913',
		UserCommands = '742803449493717134'
	}
	export enum CommandId {
		Link = '1032454252024565821',
		Settings = '1001289651862118471',
		Suggest = '1000168121098842274',
		Wishlist = '1000092959875793080'
	}
	export enum EmojiId {
		Downvote = '492412142306197504',
		Upvote = '492412118952574997'
	}
	export enum GuildId {
		Dev = '614918461453238357',
		FortniteBR = '486932163636232193'
	}
	export enum MessageId {
		CommandList = '1064964139094650971'
	}
	export enum RoleId {
		ItemShop = '568590143640961037',
		Mod = '544952148790738954',
		NitroBooster = '585533593565003819',
		NitroBlack = '628072223923765289',
		NitroBrown = '879076851207782431',
		NitroRed = '879080226930434078',
		NitroDarkOrange = '919964691504189533',
		NitroOrange = '657690317734019114',
		NitroYellow = '908041595281100872',
		NitroGreen = '879079946037903380',
		NitroSandGreen = '915657915191410768',
		NitroTurquoise = '879077880330584124',
		NitroBlue = '628078100176961536',
		NitroDarkBlue = '915657649331273778',
		NitroIndigo = '919964517922930699',
		NitroCovenPurple = '919964437631365251',
		NitroBossanovaPurple = '879077641330765894',
		NitroCosmicPurple = '879080322661228604',
		NitroAffairPurple = '879078048241188875',
		NitroPurple = '628071774034067467',
		NitroPsychicPink = '919964627775918120',
		NitroPink = '628072263593492493',
		NitroLondonPurple = '879080042578182215',
		NitroSalmonPink = '915657840272764929',
		NitroWhite = '923702586673102918'
	}
	export enum UserId {
		Catalyst = '848452706791981056'
	}
}

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
	S0BR = 'ggOwuK',
	S0ZB = 'AjRdrb',
	C4S4BR = 'gXffl',
	C4S4ZB = 'yHNFu'
}

export const RarityColors: Partial<Record<string, number>> = {
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

export const Rarities = getEnumKeys(RarityOrdering);

export const Seasons = Array.from({
	length: 25 // Increment this value every season
}, (v, k) => k + 1).map(s => `s${s}_social_bp_level`).slice(10);

export const TextBasedChannelTypes: (ApplicationCommandOptionAllowedChannelTypes & TextBasedChannel['type'])[] = [ChannelType.GuildAnnouncement, ChannelType.GuildText, ChannelType.GuildVoice];

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