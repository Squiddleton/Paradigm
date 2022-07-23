import behaviorSchema from '../schemas/behavior.js';
import giveawayUsersSchema, { IMessage } from '../schemas/giveawayusers.js';
import { Event } from '../types/types.js';
import { checkWishlists } from '../util/fortnite.js';
import client from '../clients/discord.js';

const denySubmissionMessage = 'Discussion is not allowed in this channel.  Please use the `/suggest` command for submissions.';
const exclusiveGuildId = client.exclusiveGuild.id;

export default new Event({
	name: 'messageCreate',
	async execute(message) {
		const { guildId } = message;
		if (!client.isReady()) throw new Error('The client is not ready');

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

			if (!message.author.bot) {
				if (message.channelId === '895024792439251064' && message.member !== null && !message.member.roles.cache.has('544952148790738954')) {
					await deleteSubmission();
				}

				const result = await giveawayUsersSchema.findOneAndUpdate(
					{ userId: message.author.id, 'messages.day': 30 },
					{ $inc: { 'messages.$.msgs': 1 } }
				);
				if (result === null) {
					const msgObject: IMessage = { day: 30, msgs: 1 };

					const oldResult = await giveawayUsersSchema.findOneAndUpdate(
						{ userId: message.author.id, guildId: exclusiveGuildId },
						{ $push: { messages: msgObject } }
					);

					if (oldResult === null) {
						await giveawayUsersSchema.create({
							userId: message.author.id,
							guildId: exclusiveGuildId,
							messages: [msgObject]
						});
					}
				}
			}
			else if (message.channelId === '489836390759268353' && message.author.id === '848452706791981056' && message.mentions.roles.has('568590143640961037') && message.createdAt.getHours() !== 0) {
				await checkWishlists(message.channel);
			}
			else if (message.channelId === '487026329016074241' && message.author.id === '383777390851260426' && message.embeds.length > 0) {
				const { fields } = message.embeds[0].toJSON();
				if (fields?.some(field => field.value.startsWith('Timeout'))) {
					const result = await behaviorSchema.findOneAndUpdate(
						{ _id: exclusiveGuildId },
						{ $setOnInsert: { behaviors: [{}], date: new Date().getDate() } },
						{ new: true, upsert: true }
					);

					const behaviors = result.behaviors[0];
					const targetField = fields.find(field => field.name === 'Target User');
					if (targetField !== undefined) {
						behaviors[targetField.value.split('(')[1].split(')')[0]] = 30;

						await behaviorSchema.updateMany(
							{ _id: exclusiveGuildId },
							{ behaviors: [behaviors] }
						);
					}
				}
			}
		}
	}
});