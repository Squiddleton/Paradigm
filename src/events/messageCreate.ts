import { ClientEvent } from '@squiddleton/discordjs-util';
import memberSchema from '../schemas/members.js';
import { DiscordClient } from '../util/classes.js';
import { DiscordIds } from '../util/constants.js';
import { checkWishlists } from '../util/fortnite.js';
import type { IMessage } from '../util/types.js';

const denySubmissionMessage = 'Discussion is not allowed in this channel. Please use </suggest:1000168121098842274> for submissions.';

export default new ClientEvent({
	name: 'messageCreate',
	async execute(message) {
		const { client } = message;
		DiscordClient.assertReadyClient(client);
		if (message.inGuild()) {
			const { guildId } = message;
			const exclusiveGuildId = client.exclusiveGuildId;
			const isBot = message.author.bot;

			if (!isBot) {
				const memberResult = await memberSchema.findOneAndUpdate(
					{ userId: message.author.id, guildId, 'dailyMessages.day': 30 },
					{ $inc: { 'dailyMessages.$.messages': 1 } }
				);
				if (memberResult === null) {
					const msgObject: IMessage = { day: 30, messages: 1 };

					await memberSchema.updateOne(
						{ userId: message.author.id, guildId },
						{ $push: { dailyMessages: msgObject } },
						{ upsert: true }
					);
				}
			}

			if (guildId === exclusiveGuildId) {
				if (!isBot) {
					if (message.channelId === DiscordIds.ChannelId.Submissions && message.member !== null && !message.member.roles.cache.has(DiscordIds.RoleId.Mod)) {
						const msg = await message.reply(denySubmissionMessage).catch(() => null);
						if (msg) {
							await message.delete().catch(() => message.reply('I am unable to delete this message without the Manage Messages permission.'));
							setTimeout(async () => {
								await msg.delete().catch(() => null);
							}, 5000);
						}
					}
				}
				else if (message.channelId === DiscordIds.ChannelId.ShopPosts && message.author.id === DiscordIds.UserId.Catalyst && message.mentions.roles.has(DiscordIds.RoleId.ItemShop) && message.createdAt.getHours() !== 0) {
					await checkWishlists(client);
				}
			}
		}
	}
});