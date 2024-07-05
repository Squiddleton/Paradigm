import { ClientEvent } from '@squiddleton/discordjs-util';
import type { HabaneroTrackProgress } from '@squiddleton/epic';
import { getRandomItem } from '@squiddleton/util';
import { type GuildTextBasedChannel, type Message, type Snowflake, userMention } from 'discord.js';
import { schedule } from 'node-cron';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';
import userModel from '../models/users.js';
import { DiscordClient } from '../util/classes.js';
import { getTrackProgress, trackedModes } from '../util/epic.js';
import { checkWishlists, fetchCosmetics } from '../util/fortnite.js';
import { createGiveawayEmbed } from '../util/functions.js';
import { fetchUsers, removeOldUsers } from '../util/users.js';

export default new ClientEvent({
	name: 'ready',
	once: true,
	async execute(client) {
		await client.application.fetch();
		DiscordClient.assertReadyClient(client);
		const readyMessage = `${client.user.username} is ready!`;
		await client.devChannel.send(readyMessage);
		console.log(readyMessage);

		const measureInterval = (name: string, callback: (...params: unknown[]) => Promise<void>) => () => {
			const debug = process.argv[2] === 'debug';
			const start = new Date();
			if (debug) console.log(`${name} starting at ${start}...`);
			callback().then(() => {
				if (debug) {
					const difference = Date.now() - start.getTime();
					console[difference > 5000 ? 'error' : 'log'](`${name} completed in ${difference}ms.`);
				}
			});
		};

		// Specific times
		schedule('30 0 0 * * *', measureInterval('Wishlist check', async () => {
			await checkWishlists(client);
		}), { timezone: 'Etc/UTC' });

		schedule('0 0 * * *', measureInterval('Daily chores', async () => {
			const returned = await userModel.deleteMany({ epicAccountId: null, wishlistCosmeticIds: { $size: 0 } });
			if (returned.deletedCount > 0) {
				removeOldUsers();
				await fetchUsers();
			}

			await memberModel.deleteMany({ milestones: { $size: 0 } });
			await fetchCosmetics();
		}), { timezone: 'America/New_York' });

		// Intervals

		const rankedChannel = client.channels.cache.get('1170469502136356874');
		if (!rankedChannel?.isTextBased()) return;
		const allCachedProgresses = new Map<string, HabaneroTrackProgress[]>();
		schedule('*/5 * * * *', measureInterval('Ranked tracking check', async () => {
			for (const [epicAccountId, trackedUser] of trackedModes) {
				const cachedProgresses = allCachedProgresses.get(epicAccountId);
				const newProgresses = await getTrackProgress(epicAccountId);

				if (newProgresses !== null) {
					if (cachedProgresses !== undefined) {
						for (const trackedMode of trackedUser.trackedModes) {
							const cachedProgress = cachedProgresses.find(track => track.trackguid === trackedMode.trackguid);
							const newProgress = newProgresses.find(track => track.trackguid === trackedMode.trackguid);
							if (cachedProgress === undefined || newProgress === undefined) return;

							if (newProgress.currentDivision > cachedProgress.currentDivision) {
								await rankedChannel.send(`${trackedUser.displayUsername} ${trackedMode.displayName} rank up! Division ${cachedProgress.currentDivision} + ${Math.round(cachedProgress.promotionProgress * 100)}% => ${newProgress.currentDivision} + ${Math.round(newProgress.promotionProgress * 100)}%`);
							}
							else if (newProgress.currentDivision < cachedProgress.currentDivision) {
								await rankedChannel.send(`${trackedUser.displayUsername} ${trackedMode.displayName} rank down! Division ${cachedProgress.currentDivision} + ${Math.round(cachedProgress.promotionProgress * 100)}% => ${newProgress.currentDivision} + ${Math.round(newProgress.promotionProgress * 100)}%`);
							}
							else if (newProgress.promotionProgress !== cachedProgress.promotionProgress) {
								await rankedChannel.send(`${trackedUser.displayUsername} ${trackedMode.displayName} progress update! ${Math.round(cachedProgress.promotionProgress * 100)}% => ${Math.round(newProgress.promotionProgress * 100)}%`);
							}
						}
					}

					allCachedProgresses.set(epicAccountId, newProgresses);
				}
			}
		}));

		schedule('*/1 * * * *', measureInterval('Giveaway check', async () => {
			const now = Date.now() / 1000;
			const guildResults = await guildModel.find({ giveaways: { $elemMatch: { completed: false, endTime: { $lte: now } } } });

			for (const guildResult of guildResults) {
				const guildId = guildResult._id;

				for (const giveaway of guildResult.giveaways.filter(g => !g.completed && g.endTime <= now)) {
					const deleteGiveaway = () => guildModel.findByIdAndUpdate(guildId, { $pull: { giveaways: giveaway } });

					try {
						let giveawayChannel: GuildTextBasedChannel;
						try {
							giveawayChannel = client.getVisibleChannel(giveaway.channelId);
						}
						catch {
							console.log('The channel for the following giveaway no longer exists, and the giveaway will be deleted:', giveaway);
							await deleteGiveaway();
							continue;
						}

						let message: Message;
						try {
							message = await giveawayChannel.messages.fetch(giveaway.messageId);
						}
						catch {
							console.log('The message for the following giveaway no longer exists, and the giveaway will be deleted:', giveaway);
							await deleteGiveaway();
							continue;
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

						await guildModel.updateOne(
							{
								'_id': guildId,
								'giveaways.messageId': giveaway.messageId
							},
							{ $set: { 'giveaways.$': giveaway } }
						);

						if (winnerIds.length === 0) await message.reply('This giveaway has concluded!  Unfortunately, no one entered . . .');
						else await message.reply(`This giveaway has concluded!  Congratulations to the following winners:\n${winnerIds.map((w, i) => `${i + 1}. ${userMention(w)} (${w})`).join('\n')}\nIf you won, please ensure that you have enabled DMs within the server in order to receive your prize.`);
					}
					catch (error) {
						console.error('An error has occurred with the following giveaway', giveaway, error);
					}
				}
			}
		}));
	}
});