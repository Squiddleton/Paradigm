import { EmbedBuilder } from 'discord.js';
import { ClientEvent } from '@squiddleton/discordjs-util';
import config from '../config';
import { validateGuildChannel } from '../util/functions';
import { DiscordIds } from '../util/constants';

export default new ClientEvent({
	name: 'messageReactionRemove',
	async execute(reaction, user) {
		const { client } = reaction;
		if (reaction.partial) {
			try {
				await reaction.fetch();
			}
			catch (error) {
				console.error('An error has occurred when a fetching a removed reaction: ', error);
				return;
			}
		}
		const { message } = reaction;
		if (message.guildId === config.exclusiveGuildId) {
			const toString = reaction.emoji.toString();
			const logChannel = validateGuildChannel(client, DiscordIds.Channels.Logs);

			await logChannel.send({
				embeds: [
					new EmbedBuilder()
						.setDescription(`Reaction from ${user} (${user.id}) removed.`)
						.setFields([
							{ name: 'Reaction Name', value: reaction.emoji.name ?? toString, inline: true },
							{ name: 'Reaction URL', value: reaction.emoji.url ?? toString, inline: true },
							{ name: 'Message URL', value: message.url, inline: true }
						])
						.setColor('Purple')
						.setFooter({ text: 'Logs: Reactions' })
						.setTimestamp()
				]
			});
		}
	}
});