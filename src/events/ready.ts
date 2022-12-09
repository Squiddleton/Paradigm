import { ClientEvent } from '@squiddleton/discordjs-util';
import { getRandomItem } from '@squiddleton/util';
import type { Message, Snowflake } from 'discord.js';
import { schedule } from 'node-cron';
import guildSchema from '../schemas/guilds.js';
import memberSchema from '../schemas/members.js';
import { DiscordClient } from '../util/classes.js';
import { checkWishlists, fetchShopNames, fetchStates, postShopSections } from '../util/fortnite.js';
import { createGiveawayEmbed } from '../util/functions.js';

export default new ClientEvent({
	name: 'ready',
	once: true,
	async execute(client) {
		await client.application.fetch();
		DiscordClient.assertReadyClient(client);
		const readyMessage = `${client.user.username} is ready!`;
		await client.devChannel.send(readyMessage);
		console.log(readyMessage);

		// Specific times
		let postedShopSections = false;
		schedule('30 0 0 * * *', async () => {
			postedShopSections = false;
			await checkWishlists(client);
		}, { timezone: 'Etc/UTC' });

		schedule('0 0 * * *', async () => {
			await memberSchema.updateMany({}, { $inc: { 'dailyMessages.$[].day': -1 } });
			await memberSchema.updateMany({}, { $pull: { dailyMessages: { day: { $lte: 0 } } } });
		}, { timezone: 'America/New_York' });

		// Intervals
		let cachedStates = await fetchStates();
		schedule('*/3 * * * *', async () => {
			const currentStates = await fetchStates();

			if (currentStates.length === 2 && cachedStates.length === 1 && !postedShopSections) {
				postedShopSections = true;
				const cachedNames = await fetchShopNames(cachedStates[0]);
				const currentNames = await fetchShopNames(currentStates[1]);
				await postShopSections(client, currentNames, cachedNames);
			}
			cachedStates = currentStates;
		});

		schedule('*/1 * * * *', async () => {
			const guildResults = await guildSchema.find();
			const giveaways = guildResults.map(r => r.giveaways).flat().filter(g => !g.completed && g.endTime <= (Date.now() / 1000));

			for (const giveaway of giveaways) {
				try {
					const giveawayChannel = client.getVisibleChannel(giveaway.channelId);
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
					const entrantIds = entrantsInGuild.map(m => m.id);

					for (let i = 0; i < giveaway.winnerNumber && i < entrantIds.length; i++) {
						const winnerId = getRandomItem(entrantIds);
						if (!winnerIds.includes(winnerId)) winnerIds.push(winnerId);
					}

					giveaway.completed = true;
					giveaway.winners = winnerIds;

					await message.edit({ components: [], embeds: [createGiveawayEmbed(giveaway, giveawayChannel.guild, true)] });

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