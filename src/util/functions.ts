import { Colors, EmbedBuilder, Guild } from 'discord.js';
import type { IGiveaway } from '../schemas/guilds.js';
import type { Quantity } from '../types.js';

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