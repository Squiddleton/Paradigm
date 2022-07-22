import { Client } from '../client.js';
import { Quantity } from '../types/types.js';

export const deployCommands = async (client: Client<true>) => {
	const application = await client.application.fetch();

	await application.commands.set(client.commands
		.filter(c => !c.devOnly && c.global)
		.map(c => c.toJSON())
	);

	await client.devGuild.commands.set(client.commands
		.filter(c => c.devOnly || !c.global)
		.map(c => c.toJSON())
	);
};

type noPuncOverload = {
	(str: string): string;
	(str: null|undefined): null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const noPunc: noPuncOverload = (str: any) => {
	if (!str) return null;
	return str
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replaceAll('&', 'and')
		.replace(/[^0-9a-z]/gi, '');
};

/**
 *
 * @param arr - An array to receive a quantity of each item for
 * @returns An object with keys of each item and values of the item's quantity
 */
export const quantity = (arr: string[]) => {
	const counts: Quantity = {};
	for (const item of arr) {
		counts[item] = 1 + (counts[item] || 0);
	}
	return counts;
};

export const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];