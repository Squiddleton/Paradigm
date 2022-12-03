import { connect } from 'mongoose';
import client from './clients/discord.js';
import { handleReddit } from './clients/snoowrap.js';
import { handleTwitter } from './clients/twitter.js';
import config from './config.js';

client.login(config.token);
connect(config.mongoPath);
handleReddit(client);
handleTwitter(client);