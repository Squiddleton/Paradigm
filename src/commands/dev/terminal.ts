import { exec } from 'child_process';
import { ApplicationCommandOptionType, codeBlock } from 'discord.js';
import { SlashCommand } from '@squiddleton/discordjs-util';

export default new SlashCommand({
	name: 'terminal',
	description: 'Run a command in the terminal',
	options: [
		{
			name: 'command',
			type: ApplicationCommandOptionType.String,
			description: 'A terminal command to run',
			required: true
		}
	],
	scope: 'Dev',
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		exec(interaction.options.getString('command', true), { encoding: 'utf8' }, async (error, stdout, stderr) => {
			await interaction.editReply(codeBlock('js', error ? stderr : stdout));
		});
	}
});