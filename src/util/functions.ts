import { Client as BaseClient, Colors, EmbedBuilder, Guild, Snowflake, TextBasedChannel } from 'discord.js';
import { Client } from '../clients/discord.js';
import { IGiveaway } from '../schemas/guilds.js';
import { Quantity, Scope } from '../types/types.js';

const localScopes = [Scope.Dev, Scope.Exclusive];

export const createGiveawayEmbed = (giveaway: IGiveaway | Omit<IGiveaway, 'messageId'>, guild: Guild, ended = false) => {
	const embed = new EmbedBuilder()
		.setTitle(giveaway.text)
		.setThumbnail(guild.iconURL())
		.setColor(ended ? Colors.Red : Colors.Green)
		.setFields(
			ended
				?
				[
					{ name: 'Winners', value: giveaway.winners.length === 0 ? 'None' : giveaway.winners.map((id, i) => `${i + 1}. <@${id}> (${id})`).join('\n'), inline: true },
					{ name: 'Time', value: `Started <t:${giveaway.startTime}:R>\nEnded <t:${giveaway.endTime}:R>`, inline: true }
				]
				:
				[
					{ name: 'Winner Amount', value: giveaway.winnerNumber.toString(), inline: true },
					{ name: 'Time', value: `Ends <t:${giveaway.endTime}:R>`, inline: true }
				]
		)
		.setTimestamp();
	if (giveaway.bonusRoles.length > 0) embed.addFields({ name: 'Role Bonuses', value: giveaway.bonusRoles.map(role => `${guild.roles.cache.get(role.id)?.name}: +${role.amount} Entries`).join('\n'), inline: true });

	return embed;
};

export const deployCommands = async (client: Client<true>) => {
	const application = await client.application.fetch();

	await application.commands.set(client.commands
		.filter(c => !localScopes.includes(c.scope))
		.map(c => c.toJSON())
	);

	await client.devGuild.commands.set(client.commands
		.filter(c => localScopes.includes(c.scope))
		.map(c => c.toJSON())
	);

	await client.exclusiveGuild.commands.set(client.commands
		.filter(c => c.scope === Scope.Exclusive)
		.map(c => c.toJSON())
	);
};

type noPuncOverload = {
	(str: string): string;
	(str: null | undefined): null;
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

export const validateChannel = (client: BaseClient, channelId: Snowflake, channelName: string): TextBasedChannel => {
	const channel = client.channels.cache.get(channelId);
	if (channel === undefined) throw new Error(`${channelName} is not cached, or the provided id "${channelId}" is incorrect`);
	if (!channel.isTextBased()) throw new Error(`${channelName} is not text-based; received type "${channel.type}"`);
	return channel;
};