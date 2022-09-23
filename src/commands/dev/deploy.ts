import { Client, SlashCommand } from '@squiddleton/discordjs-util';

export default new SlashCommand({
	name: 'deploy',
	description: 'Deploy all application commands to Discord',
	scope: 'Dev',
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		if (!(client instanceof Client)) throw new Error();
		await client.deploy();

		await interaction.editReply('Deployed all application commands.');
		return;
	}
});