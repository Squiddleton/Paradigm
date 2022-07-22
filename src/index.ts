import { readdirSync } from 'fs';
import config from './config';
import client from './client';
import { Event } from './types';
import { ClientEvents } from 'discord.js';

client.login(config.token);

const eventFiles = readdirSync(`${__dirname}/events`).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
	import(`./events/${file}`).then(f => {
		const event = f.default as Event<keyof ClientEvents>;
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		}
		else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	});
}