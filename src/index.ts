import { set } from 'mongoose';
import client from './clients/discord.js';
import config from './config.js';
import { handleDisconnect } from './util/functions.js';

client
	.login(config.token)
	.catch(handleDisconnect);

set('strictQuery', 'throw')
	.connect(config.mongoPath)
	.catch(handleDisconnect);