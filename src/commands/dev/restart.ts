import { SlashCommand } from '@squiddleton/discordjs-util';
import { trackedModes } from '../../util/epic.js';
import { chatInputApplicationCommandMention } from 'discord.js';
import { DiscordIds } from '../../util/constants.js';

export default new SlashCommand({
	name: 'restart',
	description: 'Restart the bot',
	scope: 'Dev',
	async execute(interaction) {
		const rankedChannel = interaction.client.channels.cache.get(DiscordIds.ChannelId.RankedProgress);
		if (rankedChannel?.isSendable() && trackedModes.size !== 0) await rankedChannel.send(`${interaction.client.user.displayName} has restarted and is no longer tracking ranked progress updates. Please use ${chatInputApplicationCommandMention('track', '1183810237900275743')} to start ranked tracking again.`);
		await interaction.reply({ content: 'Restarted!', ephemeral: true });
		return process.exit();
	}
});