import type { ApplicationCommandOptionChoiceData, ColorResolvable } from 'discord.js';

export enum BackgroundURLs {
	Gold = 'https://cdn.discordapp.com/attachments/713250274214543360/828073686870392842/gold.jpg',
	Orange = 'https://cdn.discordapp.com/attachments/713250274214543360/828073689752141874/orange.jpg',
	Purple = 'https://cdn.discordapp.com/attachments/713250274214543360/828073688834113566/purple.jpg',
	Blue = 'https://cdn.discordapp.com/attachments/713250274214543360/828073694717804584/blue.jpg',
	Green = 'https://cdn.discordapp.com/attachments/713250274214543360/828073688074289172/green.jpg'
}

export const BackgroundChoices: ApplicationCommandOptionChoiceData<string>[] = Object.keys(BackgroundURLs).map(background => ({ name: background, value: background }));

export const ChapterLengths = [10, 8];

export const LanguageChoices: ApplicationCommandOptionChoiceData<string>[] = Object.entries({
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

export const PlatformChoices: ApplicationCommandOptionChoiceData<string>[] = [
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

export enum UnitsToMS {
	Minutes = 60,
	Hours = 3600,
	Days = 86400
}

export const UnitChoices: ApplicationCommandOptionChoiceData<string>[] = Object.keys(UnitsToMS).map(unit => ({ name: unit, value: unit }));