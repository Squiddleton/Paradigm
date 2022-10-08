import type { DeviceAuth } from './util/epic.js';

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

export type Quantity = { [key: string]: number };