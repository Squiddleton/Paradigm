import { ApplicationCommandOptionType } from 'discord.js';
import { SlashCommand, evalCommand } from '@squiddleton/discordjs-util';

export default new SlashCommand({
	name: 'eval',
	description: 'Evaluate code',
	options: [
		{
			name: 'code',
			description: 'Code to evaluate',
			type: ApplicationCommandOptionType.String,
			required: true
		}
	],
	scope: 'Dev',
	async execute(interaction) {
		await evalCommand(interaction, interaction.options.getString('code', true), false);
	}
});