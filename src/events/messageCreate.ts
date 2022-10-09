import { ClientEvent } from '@squiddleton/discordjs-util';
import giveawayUserSchema from '../schemas/giveawayusers.js';
import type { IMessage } from '../types.js';
import { checkWishlists } from '../util/fortnite.js';
import { isReadyClient } from '../util/functions.js';

const denySubmissionMessage = 'Discussion is not allowed in this channel. Please use the `/suggest` command for submissions.';

export default new ClientEvent({
	name: 'messageCreate',
	async execute(message) {
		const { client } = message;
		if (message.inGuild() && isReadyClient(client)) {
			const { guildId } = message;
			const exclusiveGuildId = client.exclusiveGuildId;
			const isBot = message.author.bot;

			if (!isBot) {
				const result = await giveawayUserSchema.findOneAndUpdate(
					{ userId: message.author.id, guildId, 'messages.day': 30 },
					{ $inc: { 'messages.$.msgs': 1 } }
				);
				if (result === null) {
					const msgObject: IMessage = { day: 30, msgs: 1 };

					await giveawayUserSchema.updateOne(
						{ userId: message.author.id, guildId },
						{ $push: { messages: msgObject } },
						{ upsert: true }
					);
				}
			}

			if (guildId === exclusiveGuildId) {
				const deleteSubmission = async () => {
					const msg = await message.reply(denySubmissionMessage).catch(() => null);
					if (msg) {
						await message.delete().catch(() => message.reply('I am unable to delete this message without the Manage Messages permission.'));
						setTimeout(async () => {
							await msg.delete().catch(() => null);
						}, 5000);
					}
				};

				if (!isBot) {
					if (message.channelId === '895024792439251064' && message.member !== null && !message.member.roles.cache.has('544952148790738954')) {
						await deleteSubmission();
					}
				}
				else if (message.channelId === '489836390759268353' && message.author.id === '848452706791981056' && message.mentions.roles.has('568590143640961037') && message.createdAt.getHours() !== 0) {
					await checkWishlists(client);
				}
			}
		}
	}
});