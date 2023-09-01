import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandType, bold, chatInputApplicationCommandMention } from 'discord.js';
import { DiscordClient } from '../../util/classes.js';
import { DiscordIds } from '../../util/constants.js';

export default new SlashCommand({
	name: 'deploy',
	description: 'Deploy all application commands to Discord',
	scope: 'Dev',
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		DiscordClient.assertReadyClient(client);
		await client.deploy();
		const commands = await client.application.commands.fetch().then(all => all
			.filter(c => c.type === ApplicationCommandType.ChatInput && c.defaultMemberPermissions === null)
			.sort((a, b) => a.name.localeCompare(b.name))
		);
		await client.getGuildChannel(DiscordIds.ChannelId.UserCommands).messages.edit(DiscordIds.MessageId.CommandList, `${bold(`${client.user} Commands`)}\n\n${commands.map(c => `${chatInputApplicationCommandMention(c.name, c.id)}: ${c.description}`).join('\n')}`);

		await interaction.editReply('Deployed all application commands.');
	}
});