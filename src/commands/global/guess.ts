import { createCanvas, loadImage } from '@napi-rs/canvas';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { getRandomItem, normalize } from '@squiddleton/util';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, type ColorResolvable, Colors, ComponentType, EmbedBuilder, ModalBuilder, type ModalSubmitInteraction, TextInputBuilder, TextInputStyle, bold } from 'discord.js';
import { RarityColors, Time } from '../../util/constants.js';
import { getCosmetics } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'guess',
	description: 'Guess a Fortnite Outfit\'s name from its silhouette',
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const cosmetics = getCosmetics();
		const items = cosmetics.filter(c => c.type.displayValue === 'Outfit' && c.name !== 'TBD');
		const cosmetic = getRandomItem(items);
		const image = cosmetic.images.featured ?? cosmetic.images.icon;

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

		const silhouette = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'outfit.png' });

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
			.setColor(cosmetic.series?.colors[0].slice(0, 6) as (ColorResolvable | undefined) ?? RarityColors[cosmetic.rarity.displayValue] ?? null);

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

		const filter = (i: ModalSubmitInteraction) => {
			if (i.customId !== interaction.id) return false;
			if (normalize(i.fields.getTextInputValue('outfit')) === normalize(cosmetic.name)) return true;
			i.reply({ content: 'Your guess is incorrect.', ephemeral: true });
			return false;
		};

		try {
			const modalInteraction = await interaction.awaitModalSubmit({ filter, time: Time.GuessCollector });

			if (modalInteraction.isFromMessage()) {
				embed
					.setTitle(`${modalInteraction.user.username} correctly guessed ${bold(cosmetic.name)}`)
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
			await interaction.editReply({ attachments: [], components: [], embeds: [embed] });
		}
		collector.stop();
	}
});