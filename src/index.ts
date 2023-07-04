import { set } from 'mongoose';
import client from './clients/discord.js';
import epicClient from './clients/epic.js';
import config from './config.js';
import { handleDisconnect } from './util/functions.js';

await set('strictQuery', 'throw')
	.connect(config.mongoPath)
	.catch(handleDisconnect);

const authenticate = async () => {
	await epicClient.auth.authenticate(config.epicDeviceAuth.device1);
	setTimeout(authenticate, 7200000);
};
await authenticate();

await client
	.login(config.token)
	.catch(handleDisconnect);