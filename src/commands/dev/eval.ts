import { ApplicationCommandOptionType } from 'discord.js';
import { evalCommand, SlashCommand } from '@squiddleton/discordjs-util';

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
	async execute(interaction) {
		await evalCommand(interaction, interaction.options.getString('code', true), false);
	}
});