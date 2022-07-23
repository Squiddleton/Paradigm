import { ClientEvents } from 'discord.js';
import mongoose from 'mongoose';
import { SubmissionStream } from 'snoostorm';
import { readdirSync } from 'node:fs';

import config from './config.js';
import client from './clients/discord.js';
import { Event } from './types/types.js';
import snoowrap from './clients/snoowrap.js';

const eventFiles = readdirSync('./dist/events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
	const f = await import(`./events/${file}`);
	const event = f.default as Event<keyof ClientEvents>;
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

await client.login(config.token);
await mongoose.connect(config.mongoPath);

const fnbrSubmissions = new SubmissionStream(snoowrap, {
	subreddit: 'FortniteBR',
	pollTime: 15000
});
setTimeout(async () => {
	fnbrSubmissions.on('item', async submission => {
		if (submission.author.name === 'FortniteRedditMods' || submission.distinguished !== null) {
			await client.devChannel.send(`New mod post detected: https://www.reddit.com${submission.permalink}`);
		}
	});
}, 20000);