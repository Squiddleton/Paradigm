import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message } from 'discord.js';
import { schedule } from 'node-cron';
import client from '../clients/discord.js';
import { Event } from '../types/types.js';
import { randomFromArray, validateChannel } from '../util/functions.js';
import guildSchema from '../schemas/guilds.js';

const ready: Event<'ready'> = {
	name: 'ready',
	once: true,
	async execute() {
		await client.application.fetch();
		console.log(`${client.user.username} is ready!`);

		schedule('*/1 * * * *', async () => {
			const guildResult = await guildSchema.find();
			const giveaways = guildResult.map(g => g.giveaways).flat().filter(giveaway => !giveaway.completed && giveaway.endTime <= (Date.now() / 1000));

			for (const giveaway of giveaways) {
				const giveawayChannel = validateChannel(client, giveaway.channelId, 'Giveaway channel');

				let message: Message;
				try {
					message = await giveawayChannel.messages.fetch(giveaway.messageId);
				}
				catch {
					console.error('The message for the following giveaway no longer exists:', giveaway);
					return;
				}

				const winnerIds: string[] = [];
				for (let i = 0; i < giveaway.winnerNumber && i < giveaway.entrants.length; i++) {
					const entrants = giveaway.entrants.filter(e => !winnerIds.includes(e));
					if (entrants.length) winnerIds.push(randomFromArray(entrants));
				}
				const winnersDisplay = winnerIds.map((w, i) => `${i + 1}. <@${w}> (${w})`).join('\n');

				const row = new ActionRowBuilder<ButtonBuilder>({ components: [
					new ButtonBuilder()
						.setLabel('Enter')
						.setCustomId('fnbrgiveaway')
						.setStyle(ButtonStyle.Success)
						.setDisabled(true)
				] });
				await message.edit({
					embeds: [
						new EmbedBuilder(message.embeds[0].toJSON())
							.setColor('Red')
							.setFields([
								{ name: 'Winners', value: winnersDisplay?.slice(0, 1024) || 'None', inline: true },
								{ name: 'Time', value: `Started <t:${giveaway.startTime}:R>\nEnded <t:${giveaway.endTime}:R>`, inline: true }
							])
					],
					components: [row]
				});
				await guildSchema.updateOne(
					{
						_id: message.guildId,
						'giveaways.messageId': giveaway.messageId
					},
					{ $set: { 'giveaways.$': { completed: true, winners: winnerIds } } }
				);

				if (winnerIds.length === 0) return message.reply('This giveaway has concluded!  Unfortunately, no one entered . . .');
				return message.reply(`This giveaway has concluded!  Congratulations to the following winners:\n${winnersDisplay}\nIf you won, please ensure that you have enabled DMs within the server in order to receive your prize.`);
			}
		});
	}
};

export default ready;