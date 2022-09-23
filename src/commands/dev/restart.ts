import { SlashCommand } from '@squiddleton/discordjs-util';

export default new SlashCommand({
	name: 'restart',
	description: 'Restart the bot',
	scope: 'Dev',
	async execute(interaction) {
		await interaction.reply({ content: 'Restarted!', ephemeral: true });
		return process.exit();
	}
});