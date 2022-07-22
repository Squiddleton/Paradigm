import { Client } from '@rmp135/imgur';
import config from '../config.js';

export default new Client(config.imgurClientId);