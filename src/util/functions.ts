import { Client as BaseClient, codeBlock, Colors, CommandInteraction, EmbedBuilder, Guild, Snowflake, TextBasedChannel } from 'discord.js';
import { inspect } from 'util';
import { Client } from '../clients/discord.js';
import { IGiveaway } from '../schemas/guilds.js';
import { Quantity } from '../types/types.js';

const localScopes = ['Dev', 'Exclusive'];

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
		.filter(c => c.scope === 'Exclusive')
		.map(c => c.toJSON())
	);
};

export const evalCommand = async (interaction: CommandInteraction, client: Client<true>, code: string, allowAsync: boolean) => {
	if (interaction.user.id !== client.application.owner?.id) {
		await interaction.reply({ content: 'Only the owner may use this command', ephemeral: true });
		await client.devChannel.send(`${interaction.user} used the eval context menu with the argument "${code}" in ${interaction.channel} at <t:${Math.floor(Date.now() / 1000)}>`);
		return;
	}

	await interaction.deferReply();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const clean = (text: any) => (typeof text === 'string') ? text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)) : text;

	try {
		let evaled = await eval(allowAsync ? `(async () => {${code}})();` : code);

		if (evaled === undefined) {
			await interaction.editReply('No returned output to print.');
			return;
		}
		if (typeof evaled === 'string' && evaled.length > 0) {
			await interaction.editReply(evaled.slice(0, 2000));
			return;
		}

		const isJSON = evaled !== null && typeof evaled === 'object' && evaled.constructor.name === 'Object';
		if (isJSON) evaled = JSON.stringify(evaled, null, 2);

		if (typeof evaled !== 'string') evaled = inspect(evaled);

		await interaction.editReply(codeBlock(isJSON ? 'json' : 'js', clean(evaled).slice(0, 1987)));
	}
	catch (error) {
		await interaction.editReply(`\`ERROR\` ${codeBlock('xl', clean(error))}`);
	}
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