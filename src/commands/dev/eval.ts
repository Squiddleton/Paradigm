import { ApplicationCommandOptionType } from 'discord.js';
import { SlashCommand } from '../../types/types.js';
import { evalCommand } from '../../util/functions.js';

export default new SlashCommand({
	name: 'eval',
	description: 'Evaluate code',
	options: [
		{
			name: 'code',
			type: ApplicationCommandOptionType.String,
			description: 'Code to evaluate',
			required: true
		}
	],
	scope: 'Dev',
	async execute(interaction, client) {
		await evalCommand(interaction, client, interaction.options.getString('code', true), false);
	}
});