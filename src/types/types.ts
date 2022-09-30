import type { ApplicationCommandOptionChoiceData } from 'discord.js';
import type { DeviceAuth } from '../util/epic';

export interface Config {
	token: string;
	devChannelId: string;
	devGuildId: string;
	exclusiveGuildId: string;
	epicDeviceAuth: {
		main: DeviceAuth;
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

export type Quantity = { [key: string]: number };