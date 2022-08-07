import { SlashCommand } from '../../types/types.js';
import { deployCommands } from '../../util/functions.js';

export default new SlashCommand({
	name: 'deploy',
	description: 'Deploy all application commands to Discord',
	scope: 'Dev',
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		await deployCommands(client);

		await interaction.editReply('Deployed all application commands.');
		return;
	}
});