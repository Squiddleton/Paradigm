import { EmbedBuilder } from 'discord.js';
import { Event } from '../types/types.js';
import { validateChannel } from '../util/functions.js';

export default new Event({
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
		if (message.guildId === '486932163636232193') {
			const toString = reaction.emoji.toString();
			const logChannel = validateChannel(client, '488112900276224010', 'Log channel');

			await logChannel.send({ embeds: [
				new EmbedBuilder()
					.setDescription(`Reaction from ${user} (${user.id}) added.`)
					.setFields([
						{ name: 'Reaction Name', value: reaction.emoji.name ?? toString, inline: true },
						{ name: 'Reaction URL', value: reaction.emoji.url ?? toString, inline: true },
						{ name: 'Message URL', value: message.url, inline: true }
					])
					.setColor('Green')
					.setFooter({ text: 'Logs: Reactions' })
					.setTimestamp()
			] });
		}
	}
});