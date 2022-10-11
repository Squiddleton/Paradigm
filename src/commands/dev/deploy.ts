import { SlashCommand } from '@squiddleton/discordjs-util';
import { ErrorMessages } from '../../constants.js';
import { isReadyClient } from '../../util/functions.js';

export default new SlashCommand({
	name: 'deploy',
	description: 'Deploy all application commands to Discord',
	scope: 'Dev',
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		if (!isReadyClient(client)) throw new Error(ErrorMessages.UnreadyClient);
		await client.deploy();

		await interaction.editReply('Deployed all application commands.');
	}
});