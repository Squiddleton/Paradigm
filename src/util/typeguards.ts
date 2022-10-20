import { BackgroundURL, RarityOrdering, UnitsToMS } from './constants';

export const isBackground = (str: string): str is keyof typeof BackgroundURL => str in BackgroundURL;

export const isRarity = (rarity: string): rarity is keyof typeof RarityOrdering => rarity in RarityOrdering;

export const isUnit = (unit: string): unit is keyof typeof UnitsToMS => unit in UnitsToMS;