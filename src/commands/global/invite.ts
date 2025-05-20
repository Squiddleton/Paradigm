import { SlashCommand } from '@squiddleton/discordjs-util';

export default new SlashCommand({
	name: 'invite',
	description: 'Add The Paradigm to a server, or install it to your global apps for use across all servers and DMs',
	scope: 'Global',
	async execute(interaction) {
		await interaction.reply('[Invite The Paradigm to a server, or add to My Apps and use its commands across all servers and DMs!](https://discord.com/discovery/applications/710314063892054016)');
	}
});