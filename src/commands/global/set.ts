import { SlashCommand } from '@squiddleton/discordjs-util';
import type { Cosmetic } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';

export default new SlashCommand({
	name: 'set',
	description: 'List all cosmetics in a set',
	options: [
		{
			name: 'set',
			description: 'The set\'s name',
			type: ApplicationCommandOptionType.String,
			required: true
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();
		const set = interaction.options.getString('set', true);
		let cosmetics: Cosmetic[] = [];
		try {
			cosmetics = await fortniteAPI.filterCosmetics({ set });
		}
		catch {
			await interaction.editReply('No set matches your input.');
			return;
		}
		await interaction.editReply(`Set: **${cosmetics[0].set!.value}**\n\n${cosmetics.map(c => `${c.name} (${c.type.displayValue})`).join('\n')}`);
	}
});