import { ClientEvent } from '@squiddleton/discordjs-util';
import { schedule } from 'node-cron';
import memberModel from '../models/members.js';
import userModel from '../models/users.js';
import { DiscordClient } from '../util/classes.js';
import { postVBuckMissions, checkRankedTracking } from '../util/epic.js';
import { checkWishlists, fetchCosmetics, postShopImages } from '../util/fortnite.js';
import { closeCompletedGiveaways } from '../util/functions.js';
import { fetchUsers, removeOldUsers } from '../util/users.js';
import { GlobalFonts } from '@napi-rs/canvas';
import { FortniteAPIError } from '@squiddleton/fortnite-api';
import { setTimeout as wait } from 'node:timers/promises';

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
		schedule('30 0 0 * * *', measureInterval('Daily reset', async () => {
			await postVBuckMissions(client);
			let posted = false;
			while (!posted) {
				try {
					await postShopImages(client);
					posted = true;
				}
				catch (e) {
					if (e instanceof FortniteAPIError && e.code === 503) // Catch API booting up
						await wait(60_000); // Wait one minute, then try again
					else
						throw e;
				}
			}
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
		// schedule('*/10 * * * *', measureInterval('STW progress embed update', async () => {
		// 	await checkSTWAchievementProgress(client);
		// }));

		schedule('*/5 * * * *', measureInterval('Ranked tracking check', async () => {
			await checkRankedTracking(client);
		}));

		schedule('*/1 * * * *', measureInterval('Giveaway check', async () => {
			await closeCompletedGiveaways(client);
		}));
	}
});