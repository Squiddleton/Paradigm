import { Client } from '@squiddleton/fortnite-api';
import config from '../config.js';

const FortniteAPI = new Client({ key: config.fortniteAPIKey });

export default FortniteAPI;