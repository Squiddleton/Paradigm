import { ClientEvent } from '@squiddleton/discordjs-util';
import { DiscordClient } from '../util/classes.js';
import { DiscordIds } from '../util/constants.js';
import { checkWishlists } from '../util/fortnite.js';

export default new ClientEvent({
	name: 'messageCreate',
	async execute(message) {
		const authorIds: string[] = [DiscordIds.UserId.Catalyst, DiscordIds.UserId.Lexxy];

		if (message.channelId === DiscordIds.ChannelId.ShopPosts && message.mentions.roles.has(DiscordIds.RoleId.ItemShop) && message.createdAt.getHours() !== 0 && authorIds.includes(message.author.id)) {
			const { client } = message;
			DiscordClient.assertReadyClient(client);
			await checkWishlists(client);
		}
	}
});