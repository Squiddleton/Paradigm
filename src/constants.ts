import { ApplicationCommandOptionChoiceData } from 'discord.js';

export const BackgroundChioces: ApplicationCommandOptionChoiceData<string>[] = [
	'Gold',
	'Orange',
	'Purple',
	'Blue',
	'Green'
].map(background => ({ name: background, value: background.toLowerCase() }));

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


export const RarityOrdering = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
	Mythic: 5
};