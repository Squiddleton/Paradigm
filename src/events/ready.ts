import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message, Snowflake } from 'discord.js';
import { schedule } from 'node-cron';
import { createGiveawayEmbed, isReadyClient, randomFromArray, validateVisibleChannel } from '../util/functions.js';
import memberSchema from '../schemas/members.js';
import guildSchema from '../schemas/guilds.js';
import { checkWishlists } from '../util/fortnite.js';
import { ClientEvent } from '@squiddleton/discordjs-util';
import { ErrorMessage } from '../util/constants.js';

export default new ClientEvent({
	name: 'ready',
	once: true,
	async execute(client) {
		await client.application.fetch();

		const readyMessage = `${client.user.username} is ready!`;
		if (!isReadyClient(client)) throw new Error(ErrorMessage.UnreadyClient);
		await client.devChannel.send(readyMessage);
		console.log(readyMessage);

		schedule('30 0 0 * * *', async () => {
			await checkWishlists(client);
		}, { timezone: 'Etc/UTC' });

		schedule('0 0 * * *', async () => {
			await memberSchema.updateMany({}, { $inc: { 'dailyMessages.$[].day': -1 } });
			await memberSchema.updateMany({}, { $pull: { dailyMessages: { day: { $lte: 0 } } } });
		}, { timezone: 'America/New_York' });

		schedule('*/1 * * * *', async () => {
			const guildResult = await guildSchema.find();
			const giveaways = guildResult.map(g => g.giveaways).flat().filter(giveaway => !giveaway.completed && giveaway.endTime <= (Date.now() / 1000));

			for (const giveaway of giveaways) {
				try {
					const giveawayChannel = validateVisibleChannel(client, giveaway.channelId);
					let message: Message;
					try {
						message = await giveawayChannel.messages.fetch(giveaway.messageId);
					}
					catch {
						console.error('The message for the following giveaway no longer exists:', giveaway);
						return;
					}

					const winnerIds: Snowflake[] = [];
					const entrantsInGuild = await giveawayChannel.guild.members.fetch({ user: giveaway.entrants });
					const entrantIds = entrantsInGuild.map(member => member.id);

					for (let i = 0; i < giveaway.winnerNumber && i < entrantIds.length; i++) {
						const winnerId = randomFromArray(entrantIds);
						if (!winnerIds.includes(winnerId)) winnerIds.push(winnerId);
					}

					giveaway.completed = true;
					giveaway.winners = winnerIds;

					const row = new ActionRowBuilder<ButtonBuilder>({ components: [
						new ButtonBuilder()
							.setLabel('Enter')
							.setCustomId('giveaway')
							.setStyle(ButtonStyle.Success)
							.setDisabled(true)
					] });
					await message.edit({ embeds: [createGiveawayEmbed(giveaway, giveawayChannel.guild, true)], components: [row] });

					await guildSchema.updateOne(
						{
							_id: message.guildId,
							'giveaways.messageId': giveaway.messageId
						},
						{ $set: { 'giveaways.$': giveaway } }
					);

					if (winnerIds.length === 0) return message.reply('This giveaway has concluded!  Unfortunately, no one entered . . .');
					return message.reply(`This giveaway has concluded!  Congratulations to the following winners:\n${winnerIds.map((w, i) => `${i + 1}. <@${w}> (${w})`).join('\n')}\nIf you won, please ensure that you have enabled DMs within the server in order to receive your prize.`);

				}
				catch (error) {
					console.error('An error has occurred with the following giveaway', giveaway, error);
				}
			}
		});
	}
});