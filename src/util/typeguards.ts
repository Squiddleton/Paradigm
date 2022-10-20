import type { AttachmentBuilder } from 'discord.js';
import { BackgroundURL, RarityOrdering, UnitsToMS } from './constants';

export const isBackground = (str: string): str is keyof typeof BackgroundURL => str in BackgroundURL;

export const isLoadoutError = (value: AttachmentBuilder | string): value is string => typeof value === 'string';

export const isRarity = (rarity: string): rarity is keyof typeof RarityOrdering => rarity in RarityOrdering;

export const isUnit = (unit: string): unit is keyof typeof UnitsToMS => unit in UnitsToMS;