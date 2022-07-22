import { readdirSync } from 'fs';
import config from './config';
import client from './client';

client.login(config.token);

const eventFiles = readdirSync(`${__dirname}/events`).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
	import(`./events/${file}`).then(({ default: event }) => {
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args, client));
		}
		else {
			client.on(event.name, (...args) => event.execute(...args, client));
		}
	});
}