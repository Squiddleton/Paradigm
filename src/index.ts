import { set } from 'mongoose';
import client from './clients/discord.js';
import config from './config.js';
import { handleDisconnect } from './util/functions.js';

await set('strictQuery', 'throw')
	.connect(config.mongoPath)
	.catch(handleDisconnect);

await client
	.login(config.token)
	.catch(handleDisconnect);