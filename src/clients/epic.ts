import { EpicClient } from '@squiddleton/epic';
import config from '../config.js';

const epicClient = new EpicClient({ reauthenticate: true });
epicClient.auth.authenticate(config.epicDeviceAuth.device1);

export default epicClient;