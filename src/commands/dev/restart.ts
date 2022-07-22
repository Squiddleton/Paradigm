import { SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'restart',
	description: 'Restarts the bot',
	devOnly: true,
	async execute(interaction) {
		await interaction.reply({ content: 'Restarted!', ephemeral: true });
		return process.exit();
	}
});