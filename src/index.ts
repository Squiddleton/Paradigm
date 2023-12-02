import * as timers from 'timers/promises';
import { EpicAPIError } from '@squiddleton/epic';
import { set } from 'mongoose';
import client from './clients/discord.js';
import epicClient from './clients/epic.js';
import config from './config.js';
import { fetchCosmetics } from './util/fortnite.js';
import { handleDisconnect } from './util/functions.js';
import { fetchUsers } from './util/users.js';

await set('strictQuery', 'throw')
	.connect(config.mongoPath)
	.catch(handleDisconnect);
console.log('Connected to MongoDB.');

await fetchCosmetics();
await fetchUsers();
console.log('Populated caches.');

const authenticate = async () => {
	await epicClient.auth.authenticate(config.epicDeviceAuth.device1);
	setTimeout(authenticate, 7200000);
};

let authenticated = false;
while (!authenticated) {
	let delay = 1;
	try {
		await authenticate();
		authenticated = true;
	}
	catch (error) {
		if (error instanceof EpicAPIError && error.status === 503) {
			delay *= 2;
			console.log(`Reuauthenticating in ${delay} minutes...`);
			await timers.setTimeout(delay * 60000);
		}
	}
}
console.log('Authenticated with Epic Games.');

await client
	.login(config.token)
	.catch(handleDisconnect);