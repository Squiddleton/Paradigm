import mongoose from 'mongoose';
import client from './clients/discord.js';
import { handleReddit } from './clients/snoowrap.js';
import config from './config.js';

client.login(config.token);
mongoose.connect(config.mongoPath);
handleReddit(client);