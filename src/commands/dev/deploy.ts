import { SlashCommand } from '@squiddleton/discordjs-util';
import { isReadyClient } from '../../util/functions';

export default new SlashCommand({
	name: 'deploy',
	description: 'Deploy all application commands to Discord',
	scope: 'Dev',
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		if (!isReadyClient(client)) throw new Error();
		await client.deploy();

		await interaction.editReply('Deployed all application commands.');
	}
});