import { ApplicationCommandOptionType, Message } from 'discord.js';
import Canvas from 'canvas';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { ErrorMessage } from '../../util/constants';
import { validateGuildChannel } from '../../util/functions';
import type { AnyGuildTextChannel } from '../../util/types';

export default new SlashCommand({
	name: 'suggest',
	description: 'Suggest an emote or sticker for the server',
	options: [
		{
			name: 'image',
			description: 'An image to upload as an emote or sticker',
			type: ApplicationCommandOptionType.Attachment,
			required: true
		},
		{
			name: 'name',
			description: 'The name of the emote or sticker',
			type: ApplicationCommandOptionType.String,
			required: true
		},
		{
			name: 'type',
			description: 'The type of submission',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{ name: 'Emote', value: 'Emote' },
				{ name: 'Sticker', value: 'Sticker' }
			]
		}
	],
	scope: 'Exclusive',
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		const { url } = interaction.options.getAttachment('image', true);
		if (!['gif', 'webp'].some(ending => url.endsWith(ending))) {
			try {
				await Canvas.loadImage(url);
			}
			catch {
				await interaction.editReply('Your image link was invalid.');
				return;
			}
		}

		const submissionName = interaction.options.getString('name');
		const type = interaction.options.getString('type');

		const submissionChannelId = '895024792439251064';
		let submissionChannel: AnyGuildTextChannel;
		try {
			submissionChannel = validateGuildChannel(client, submissionChannelId);
		}
		catch (error) {
			if (error instanceof Error && error.message === ErrorMessage.MissingPermissions.replace('{channelId}', submissionChannelId)) {
				await interaction.editReply('The bot lacks the View Channel permission, Send Messages permission, or both in that channel. Please grant it both permissions, and then try again.');
				return;
			}
			throw error;
		}

		let message: Message;
		try {
			message = await submissionChannel.send({ content: `Submission by ${interaction.user.toString()}\n${submissionName} (${type})`, files: [url] });
		}
		catch {
			message = await submissionChannel.send(`Submission by ${interaction.user.toString()}\n${submissionName} (${type})\n${url}`);
		}
		await message.react('492412118952574997');
		await message.react('492412142306197504');

		await interaction.editReply('You have successfully submitted your suggestion.');
	}
});