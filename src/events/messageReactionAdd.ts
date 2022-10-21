import { ClientEvent } from '@squiddleton/discordjs-util';
import config from '../config';
import { TimestampedEmbed } from '../util/classes';
import { DiscordIds } from '../util/constants';
import { validateGuildChannel } from '../util/functions';

export default new ClientEvent({
	name: 'messageReactionAdd',
	async execute(reaction, user) {
		const { client } = reaction;
		if (reaction.partial) {
			try {
				await reaction.fetch();
			}
			catch (error) {
				console.error('An error has occurred when a fetching an added reaction: ', error);
				return;
			}
		}
		const { message } = reaction;
		if (message.guildId === config.exclusiveGuildId) {
			const toString = reaction.emoji.toString();
			const logChannel = validateGuildChannel(client, DiscordIds.Channels.Logs);

			await logChannel.send({
				embeds: [
					new TimestampedEmbed()
						.setDescription(`Reaction from ${user} (${user.id}) added.`)
						.setFields([
							{ name: 'Reaction Name', value: reaction.emoji.name ?? toString, inline: true },
							{ name: 'Reaction URL', value: reaction.emoji.url ?? toString, inline: true },
							{ name: 'Message URL', value: message.url, inline: true }
						])
						.setColor('Green')
						.setFooter({ text: 'Logs: Reactions' })
				]
			});
		}
	}
});