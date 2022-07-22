import { Scope, SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'restart',
	description: 'Restarts the bot',
	scope: Scope.Dev,
	async execute(interaction) {
		await interaction.reply({ content: 'Restarted!', ephemeral: true });
		return process.exit();
	}
});