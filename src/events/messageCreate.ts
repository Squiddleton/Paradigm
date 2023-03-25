import { ClientEvent } from '@squiddleton/discordjs-util';
import { DiscordAPIError, type Message, PermissionFlagsBits, RESTJSONErrorCodes } from 'discord.js';
import memberModel from '../models/members.js';
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

			if (guildId === exclusiveGuildId) {
				if (!isBot) {
					if (message.channelId === DiscordIds.ChannelId.StickerEmojiSubmissions && message.member !== null && !message.member.roles.cache.has(DiscordIds.RoleId.Mod)) {
						const botPermissions = message.channel.permissionsFor(client.user);
						if (botPermissions !== null && botPermissions.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
							const tryToDelete = async (m: Message) => {
								try {
									await m.delete();
								}
								catch (e) {
									if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownMessage) console.error(e);
								}
							};

							const msg = await message.reply(denySubmissionMessage);
							if (botPermissions.has(PermissionFlagsBits.ManageMessages)) await tryToDelete(message);
							setTimeout(() => tryToDelete(msg), 5000);
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