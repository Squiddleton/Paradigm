import mongoose from 'mongoose';
import config from './config.js';
import client from './clients/discord.js';
import { handleReddit } from './clients/snoowrap.js';

client.login(config.token);
mongoose.connect(config.mongoPath);
handleReddit(client);