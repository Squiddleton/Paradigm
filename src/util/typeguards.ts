import type { AttachmentBuilder, Client } from 'discord.js';
import type { DiscordClient } from './classes';
import { BackgroundURL, RarityOrdering, UnitsToMS } from './constants';
import type { RawEpicError } from './types';

export const isBackground = (str: string): str is keyof typeof BackgroundURL => str in BackgroundURL;

export const isLoadoutError = (value: AttachmentBuilder | string): value is string => typeof value === 'string';

export const isRarity = (rarity: string): rarity is keyof typeof RarityOrdering => rarity in RarityOrdering;

export const isRawEpicError = (obj: any): obj is RawEpicError => 'errorCode' in obj;

export const isReadyClient = (client: Client): client is DiscordClient<true> => client.isReady();

export const isUnit = (unit: string): unit is keyof typeof UnitsToMS => unit in UnitsToMS;