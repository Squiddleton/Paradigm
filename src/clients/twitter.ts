import type { Client } from 'discord.js';
import Twit from 'twit';
import config from '../config';

const twitClient = new Twit(config.twitter);
export default twitClient;

export const handleTwitter = (client: Client) => {
	const accounts = [
		'1049367321201074177',
		'1142888473625530370',
		'1019980702119530497',
		'4906213247',
		'1075473963969642496',
		'3246399281',
		'1123044117892624384',
		'1032390010165575682'
	];

	const stream = twitClient.stream('statuses/filter', {
		follow: accounts
	});
	stream.on('tweet', async tweet => {
		if (accounts.includes(tweet.user.id_str)) {
			const channel = client.channels.cache.get('819870118720438273');
			if (channel !== undefined && channel.isTextBased()) {
				await channel.send(`https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`);
			}
		}
	});
};