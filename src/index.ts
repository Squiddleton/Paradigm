import { set } from 'mongoose';
import client from './clients/discord.js';
import epicClient from './clients/epic.js';
import config from './config.js';
import { fetchCosmetics } from './util/fortnite.js';
import { handleDisconnect } from './util/functions.js';
import { populateUsers } from './util/users.js';

await set('strictQuery', 'throw')
	.connect(config.mongoPath)
	.catch(handleDisconnect);
console.log('Connected to MongoDB.');

await fetchCosmetics();
await populateUsers();
console.log('Populated caches.');

const authenticate = async () => {
	await epicClient.auth.authenticate(config.epicDeviceAuth.device1);
	setTimeout(authenticate, 7200000);
};
await authenticate();
console.log('Authenticated with Epic Games.');

await client
	.login(config.token)
	.catch(handleDisconnect);