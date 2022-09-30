import mongoose from 'mongoose';
import { CommentStream, SubmissionStream } from 'snoostorm';
import config from './config.js';
import client from './clients/discord.js';
import snoowrap from './clients/snoowrap.js';

client.login(config.token);
mongoose.connect(config.mongoPath);

const fnbrSubmissions = new SubmissionStream(snoowrap, {
	subreddit: 'FortniteBR',
	pollTime: 15000
});
const fnbrComments = new CommentStream(snoowrap, {
	subreddit: 'FortniteBR',
	pollTime: 40000
});
setTimeout(() => {
	fnbrSubmissions.on('item', async submission => {
		if (submission.author.name === 'TheFortniteTeam' || submission.author_flair_text?.includes('Epic Games')) {
			await client.devChannel.send(`New Epic post detected: https://www.reddit.com${submission.permalink}`);
		}
	});
}, 20000);
setTimeout(() => {
	fnbrComments.on('item', async comment => {
		if (comment.author.name === 'TheFortniteTeam' || comment.author_flair_text?.includes('Epic Games')) {
			await client.devChannel.send(`New Epic comment detected: https://www.reddit.com${comment.permalink}`);
		}
	});
}, 45000);