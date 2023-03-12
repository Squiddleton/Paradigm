import { exec } from 'child_process';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, codeBlock } from 'discord.js';

export default new SlashCommand({
	name: 'terminal',
	description: 'Run a command in the terminal',
	options: [
		{
			name: 'command',
			description: 'A terminal command to run',
			type: ApplicationCommandOptionType.String,
			required: true
		}
	],
	scope: 'Dev',
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		exec(interaction.options.getString('command', true), { encoding: 'utf8' }, async (error, stdout, stderr) => {
			let content = stderr || stdout;
			content = content === '' ? 'There was no output returned.' : codeBlock(content.slice(0, 1992));
			await interaction.editReply(content);
		});
	}
});