import { SlashCommand } from '@squiddleton/discordjs-util';
import { DiscordClient } from '../../util/classes.js';
import { MessageFlags } from 'discord.js';

export default new SlashCommand({
	name: 'deploy',
	description: 'Deploy all application commands to Discord',
	scope: 'Dev',
	async execute(interaction, client) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		DiscordClient.assertReadyClient(client);
		await client.deploy();

		await interaction.editReply('Deployed all application commands.');
	}
});