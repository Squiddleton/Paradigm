import { EpicClient } from '@squiddleton/epic';
import config from '../config.js';

const epicClient = new EpicClient();

export default epicClient;

const authenticate = async () => {
	await epicClient.auth.authenticate(config.epicDeviceAuth.device1);
	setTimeout(authenticate, 7200000);
};

await authenticate();