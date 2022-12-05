import type { Client } from 'discord.js';
import { ETwitterStreamEvent, TwitterApi } from 'twitter-api-v2';
import config from '../config';
import { DiscordIds } from '../util/constants';

const twitterClient = new TwitterApi(config.twitter);
const readOnlyClient = twitterClient.readOnly;
export default readOnlyClient;

export const handleTwitter = async (client: Client) => {
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

	const stream = await readOnlyClient.v1.filterStream({ follow: accounts });
	stream.on(ETwitterStreamEvent.Data, async tweet => {
		if (accounts.includes(tweet.user.id_str)) {
			const channel = client.channels.cache.get(DiscordIds.ChannelId.LeakPosts);
			if (channel !== undefined && channel.isTextBased()) {
				await channel.send(`https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`);
			}
		}
	});
};