import { connect, set } from 'mongoose';
import client from './clients/discord.js';
import { handleTwitter } from './clients/twitter.js';
import config from './config.js';

client.login(config.token);
set('strictQuery', 'throw');
connect(config.mongoPath);
handleTwitter(client);