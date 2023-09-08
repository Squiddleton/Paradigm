import { createCanvas, loadImage } from '@napi-rs/canvas';
import { SlashCommand } from '@squiddleton/discordjs-util';
import type { Cosmetic } from '@squiddleton/fortnite-api';
import { getRandomItem, normalize } from '@squiddleton/util';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, Colors, ComponentType, DiscordAPIError, EmbedBuilder, ModalBuilder, type ModalSubmitInteraction, RESTJSONErrorCodes, TextInputBuilder, TextInputStyle, bold } from 'discord.js';
import { Time } from '../../util/constants.js';
import { getCosmeticColor, getCosmetics } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'guess',
	description: 'Guess a Fortnite Outfit\'s name from its silhouette',
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const cosmetics = getCosmetics();

		const getCosmeticWithImage = (): [Cosmetic, string | null] => {
			const items = cosmetics.filter(c => c.type.displayValue === 'Outfit' && c.name !== 'TBD');
			const cosmetic = getRandomItem(items);
			const image = cosmetic.images.featured ?? cosmetic.images.icon;
			return [cosmetic, image];
		};

		let cosmetic: Cosmetic | null = null;
		let image: string | null = null;
		while (cosmetic === null || image === null) {
			[cosmetic, image] = getCosmeticWithImage();
		}

		const background = await loadImage(image);
		const canvas = createCanvas(background.width, background.height);
		const ctx = canvas.getContext('2d');
		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const pix = imgData.data;
		for (let i = 0, n = pix.length; i < n; i += 4) {
			pix[i] = 0;
			pix[i + 1] = 0;
			pix[i + 2] = 0;
		}
		ctx.putImageData(imgData, 0, 0);

		const silhouette = new AttachmentBuilder(await canvas.encode('png'), { name: 'outfit.png' });

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setLabel('Guess')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('❓')
				.setCustomId('guess')
		);

		const embed = new EmbedBuilder()
			.setTitle('What is this Outfit?')
			.setImage('attachment://outfit.png')
			.setColor(getCosmeticColor(cosmetic));

		const message = await interaction.editReply({ components: [row], embeds: [embed], files: [silhouette] });

		const modal = new ModalBuilder()
			.setTitle('Guess the Outfit')
			.setCustomId(interaction.id)
			.setComponents(
				new ActionRowBuilder<TextInputBuilder>().setComponents(
					new TextInputBuilder()
						.setLabel('Outfit Name')
						.setPlaceholder('Jonesy the First')
						.setStyle(TextInputStyle.Short)
						.setCustomId('outfit')
						.setRequired()
				)
			);

		const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: Time.GuessCollector });
		collector.on('collect', async buttonInteraction => {
			await buttonInteraction.showModal(modal);
		});

		const filter = (c: Cosmetic) => (i: ModalSubmitInteraction) => {
			if (i.customId !== interaction.id) return false;
			if (normalize(i.fields.getTextInputValue('outfit')) === normalize(c.name)) return true;
			i.reply({ content: 'Your guess is incorrect.', ephemeral: true });
			return false;
		};

		try {
			const modalInteraction = await interaction.awaitModalSubmit({ filter: filter(cosmetic), time: Time.GuessCollector });

			if (modalInteraction.isFromMessage()) {
				embed
					.setTitle(`${modalInteraction.inCachedGuild() ? modalInteraction.member.displayName : modalInteraction.user.username} correctly guessed ${bold(cosmetic.name)}`)
					.setImage(image)
					.setColor(Colors.Green);
				await modalInteraction.update({ attachments: [], components: [], embeds: [embed] });
			}

		}
		catch {
			embed
				.setTitle(`Nobody guessed ${bold(cosmetic.name)}`)
				.setImage(image)
				.setColor(Colors.Red);
			try {
				await interaction.editReply({ attachments: [], components: [], embeds: [embed] });
			}
			catch (error) {
				if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.UnknownMessage) throw error;
			}
		}
		collector.stop();
	}
});