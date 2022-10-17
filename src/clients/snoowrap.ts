import { CommentStream, SubmissionStream } from 'snoostorm';
import RedditClient from 'snoowrap';
import config from '../config.js';
import type { DiscordClient } from '../util/classes.js';

const reddit = new RedditClient(config.snoowrap);
export default reddit;

export const handleReddit = (client: DiscordClient) => {
	const fnbrSubmissions = new SubmissionStream(reddit, {
		subreddit: 'FortniteBR',
		pollTime: 15000
	});
	const fnbrComments = new CommentStream(reddit, {
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
};