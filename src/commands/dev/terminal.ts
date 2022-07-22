import { exec } from 'child_process';
import { ApplicationCommandOptionType, Formatters } from 'discord.js';
import { SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'terminal',
	description: 'Runs a command in the terminal',
	options: [
		{
			name: 'command',
			type: ApplicationCommandOptionType.String,
			description: 'A terminal command to run',
			required: true
		}
	],
	devOnly: true,
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		exec(interaction.options.getString('command', true), { encoding: 'utf8' }, async (error, stdout, stderr) => {
			await interaction.editReply(Formatters.codeBlock('js', error ? stderr : stdout));
		});
	}
});