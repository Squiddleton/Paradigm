import { ClientEvent } from '@squiddleton/discordjs-util';
import type { HabaneroTrackProgress } from '@squiddleton/epic';
import { getRandomItem } from '@squiddleton/util';
import { codeBlock, type GuildTextBasedChannel, type Message, roleMention, type Snowflake, userMention } from 'discord.js';
import { schedule } from 'node-cron';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';
import userModel from '../models/users.js';
import { DiscordClient } from '../util/classes.js';
import { createSTWProgressImage, getSTWProgress, getTrackProgress, trackedModes } from '../util/epic.js';
import { checkWishlists, fetchCosmetics } from '../util/fortnite.js';
import { createGiveawayEmbed } from '../util/functions.js';
import { fetchUsers, removeOldUsers } from '../util/users.js';
import { DiscordIds, divisionNames, EpicEndpoint } from '../util/constants.js';
import { GlobalFonts } from '@napi-rs/canvas';
import type { STWTrackedAccount, WorldInfo } from '../util/types.js';
import epicClient from '../clients/epic.js';

export default new ClientEvent({
	name: 'ready',
	once: true,
	async execute(client) {
		await client.application.fetch();
		DiscordClient.assertReadyClient(client);
		GlobalFonts.registerFromPath('./fonts/fortnite.otf', 'fortnite');
		GlobalFonts.registerFromPath('./fonts/jetbrains-mono.ttf', 'jetbrains');
		const readyMessage = `${client.user.displayName} is ready!`;
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
		schedule('30 0 0 * * *', measureInterval('Wishlist and VB check', async () => {
			await checkWishlists(client);

			const worldInfo = await epicClient.auth.get<WorldInfo>(EpicEndpoint.WorldInfo);
			let vbuckMissions = 0;
			let totalVbucks = 0;
			for (const alert of worldInfo.missionAlerts) {
				for (const { missionAlertRewards } of alert.availableMissionAlerts) {
					for (const item of missionAlertRewards.items) {
						if (item.itemType.includes('mtx')) {
							vbuckMissions++;
							totalVbucks += item.quantity;
						}
					}
				}
			}
			if (vbuckMissions > 0) {
				const stwChannel = client.getVisibleChannel(DiscordIds.ChannelId.STWTracking);
				stwChannel.send(`There ${vbuckMissions === 1 ? 'is' : 'are'} ${vbuckMissions} V-buck mission${vbuckMissions === 1 ? '' : 's'} today for a total of ${totalVbucks} V-bucks ${roleMention(DiscordIds.RoleId.STW)}.`);
			}
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
		const STWTrackedAccounts: STWTrackedAccount[] = [
			{ id: 'fa646860d86c4def9716359b4d1a0ff8', name: 'Squid', progress: await getSTWProgress('fa646860d86c4def9716359b4d1a0ff8') },
			{ id: '7df93ec9c5864474ba1ab22e82a8ac64', name: 'Jake', progress: await getSTWProgress('7df93ec9c5864474ba1ab22e82a8ac64') },
			{ id: '1b57ac3f27af49e09c0d2c874e180ff4', name: 'Riley', progress: await getSTWProgress('1b57ac3f27af49e09c0d2c874e180ff4') },
			{ id: 'e3180e59cf4c4ad59985a9aa7c2623d2', name: 'Koba', progress: await getSTWProgress('e3180e59cf4c4ad59985a9aa7c2623d2') }
		];

		schedule('*/10 * * * *', measureInterval('STW progress embed update', async () => {
			const buffer = await createSTWProgressImage();
			const rankedChannel = client.getVisibleChannel(DiscordIds.ChannelId.STWTracking);
			await rankedChannel.messages.edit(DiscordIds.MessageId.STWProgress, { attachments: [], files: [buffer] });

			for (const account of STWTrackedAccounts) {
				const allNewProgress = await getSTWProgress(account.id);
				let foundNew = false;
				if (allNewProgress === null) continue;

				for (const newProgress of allNewProgress) {
					const oldProgress = account.progress?.find(p => p.template === newProgress.template);
					if (!oldProgress?.active) continue;

					const oldIncs = Math.floor(oldProgress.completion / newProgress.increment);
					const newIncs = Math.floor(newProgress.completion / newProgress.increment);
					if (newIncs > oldIncs) {
						foundNew = true;
						const rankedChannel = client.getVisibleChannel(DiscordIds.ChannelId.STWTracking);

						await rankedChannel.send(`New progress for ${account.name} for STW ${newProgress.questName} quest: ${newProgress.completion}/${newProgress.max}`);
					}
				}
				if (foundNew) account.progress = allNewProgress;
			}
		}));

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

							const rankedChannel = client.getVisibleChannel(DiscordIds.ChannelId.RankedProgress);

							const change = ((newProgress.currentDivision + newProgress.promotionProgress) - (cachedProgress.currentDivision + cachedProgress.promotionProgress)) * 100;
							const changeStr = codeBlock('diff', `${change >= 0 ? '+' : ''}${Math.round(change)}%`);

							if (newProgress.currentDivision > cachedProgress.currentDivision) {
								await rankedChannel.send(`${trackedUser.displayUsername} ${trackedMode.displayName} rank up! ${changeStr} ${divisionNames[cachedProgress.currentDivision]} + ${Math.round(cachedProgress.promotionProgress * 100)}% => ${divisionNames[newProgress.currentDivision]} + ${Math.round(newProgress.promotionProgress * 100)}%`);
							}
							else if (newProgress.currentDivision < cachedProgress.currentDivision) {
								await rankedChannel.send(`${trackedUser.displayUsername} ${trackedMode.displayName} rank down! ${changeStr} ${divisionNames[cachedProgress.currentDivision]} + ${Math.round(cachedProgress.promotionProgress * 100)}% => ${divisionNames[newProgress.currentDivision]} + ${Math.round(newProgress.promotionProgress * 100)}%`);
							}
							else if (newProgress.promotionProgress !== cachedProgress.promotionProgress) {
								await rankedChannel.send(`${trackedUser.displayUsername} ${trackedMode.displayName} progress update! ${changeStr} ${divisionNames[cachedProgress.currentDivision]} ${Math.round(cachedProgress.promotionProgress * 100)}% => ${Math.round(newProgress.promotionProgress * 100)}%`);
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

						await guildModel.updateOne(
							{
								'_id': guildId,
								'giveaways.messageId': giveaway.messageId
							},
							{ $set: { 'giveaways.$': giveaway } }
						);

						try {
							await message.edit({ components: [], embeds: [createGiveawayEmbed(giveaway, giveawayChannel.guild, true)] });

							if (winnerIds.length === 0) await message.reply('This giveaway has concluded!  Unfortunately, no one entered . . .');
							else await message.reply(`This giveaway has concluded!  Congratulations to the following winners:\n${winnerIds.map((w, i) => `${i + 1}. ${userMention(w)} (${w})`).join('\n')}\nIf you won, please ensure that you have enabled DMs within the server in order to receive your prize.`);
						}
						catch (error) {
							console.error(error);
						}
					}
					catch (error) {
						console.error('An error has occurred with the following giveaway', giveaway, error);
					}
				}
			}
		}));
	}
});