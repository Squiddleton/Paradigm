import { BackgroundURL, RarityOrdering, UnitsToMS } from './constants';

export const isBackground = (str: string): str is keyof typeof BackgroundURL => str in BackgroundURL;

export const isRarity = (str: string): str is keyof typeof RarityOrdering => str in RarityOrdering;

export const isUnit = (str: string): str is keyof typeof UnitsToMS => str in UnitsToMS;