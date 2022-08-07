import { ApplicationCommandOptionType } from 'discord.js';
import Canvas from 'canvas';
import { SlashCommand } from '../../types/types.js';
import { validateChannel } from '../../util/functions.js';

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
		const submissionChannel = validateChannel(client, '895024792439251064', 'Submission channel');

		try {
			await submissionChannel.send({ content: `Submission by ${interaction.user.toString()}\n${submissionName} (${type})`, files: [url] });
		}
		catch {
			await submissionChannel.send(`Submission by ${interaction.user.toString()}\n${submissionName} (${type})\n${url}`);
		}
		await interaction.editReply('You have successfully submitted your suggestion.');
		return;
	}
});