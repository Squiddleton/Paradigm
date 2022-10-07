import { Client as FortniteAPIClient } from '@squiddleton/fortnite-api';
import config from '../config.js';

const fortniteAPI = new FortniteAPIClient({ key: config.fortniteAPIKey });
export default fortniteAPI;