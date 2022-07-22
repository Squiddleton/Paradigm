import { Event } from '../types.js';

const ready: Event<'ready'> = {
	name: 'ready',
	once: true,
	async execute(client) {
		console.log(`${client.user.username} is ready!`);
	}
};

export default ready;