import { ClientEvent } from '@squiddleton/discordjs-util';
import memberModel from '../models/members.js';
import { DiscordClient } from '../util/classes.js';
import { DiscordIds } from '../util/constants.js';
import { checkWishlists } from '../util/fortnite.js';
import type { IMessage } from '../util/types.js';

export default new ClientEvent({
	name: 'messageCreate',
	async execute(message) {
		const { client } = message;
		DiscordClient.assertReadyClient(client);
		if (message.inGuild()) {
			const { guildId } = message;
			const isBot = message.author.bot;

			if (!isBot) {
				const memberResult = await memberModel.findOneAndUpdate(
					{ userId: message.author.id, guildId, 'dailyMessages.day': 30 },
					{ $inc: { 'dailyMessages.$.messages': 1 } }
				);
				if (memberResult === null) {
					const msgObject: IMessage = { day: 30, messages: 1 };

					await memberModel.updateOne(
						{ userId: message.author.id, guildId },
						{ $push: { dailyMessages: msgObject } },
						{ upsert: true }
					);
				}
			}
			else if (message.channelId === DiscordIds.ChannelId.ShopPosts && message.mentions.roles.has(DiscordIds.RoleId.ItemShop) && message.createdAt.getHours() !== 0 && (message.author.id === DiscordIds.UserId.Catalyst || message.author.id === DiscordIds.UserId.Lexxy)) {
				await checkWishlists(client);
			}
		}
	}
});