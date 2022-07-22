import client from '../clients/discord.js';
import { Event } from '../types/types.js';

const ready: Event<'ready'> = {
	name: 'ready',
	once: true,
	async execute() {
		await client.application.fetch();
		console.log(`${client.user.username} is ready!`);
	}
};

export default ready;