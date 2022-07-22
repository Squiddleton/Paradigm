import { Event } from '../types';

const ready: Event<'ready'> = {
	name: 'ready',
	once: true,
	async execute(client) {
		console.log(`${client.user.username} is ready!`);
	}
};

export default ready;