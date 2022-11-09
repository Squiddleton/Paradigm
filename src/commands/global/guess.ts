import { SlashCommand } from '@squiddleton/discordjs-util';
import { getRandomItem, normalize } from '@squiddleton/util';
import { createCanvas, loadImage } from 'canvas';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, Colors, ComponentType, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from 'discord.js';
import { TimestampedEmbed } from '../../util/classes.js';
import { GuessCollectorTime, RarityColors } from '../../util/constants.js';
import { fetchCosmetics } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'guess',
	description: 'Guess a Fortnite Outfit\'s name from its silhouette',
	scope: 'Global',
	async execute(interaction) {
		const cosmetics = await fetchCosmetics();
		const items = cosmetics.filter(i => i.type.displayValue === 'Outfit' && i.name !== 'TBD');
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
			pix[i + 3] = pix[i + 3];
		}
		ctx.putImageData(imgData, 0, 0);

		const silhouette = new AttachmentBuilder(canvas.toBuffer(), { name: 'outfit.png' });

		const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setLabel('Guess')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('❓')
				.setCustomId('guess')
		);

		const color = RarityColors[cosmetic.rarity.displayValue];

		const embed = new TimestampedEmbed()
			.setTitle('What is this Outfit?')
			.setImage('attachment://outfit.png')
			.setColor(cosmetic.series?.colors[0].slice(0, 6) as ColorResolvable ?? color ?? null);

		const message = await interaction.reply({ components: [row], embeds: [embed], files: [silhouette] });

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

		const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: GuessCollectorTime });
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
			const modalInteraction = await interaction.awaitModalSubmit({ filter, time: GuessCollectorTime });

			if (modalInteraction.isFromMessage()) {
				embed
					.setTitle(`${modalInteraction.user.username} correctly guessed **${cosmetic.name}**`)
					.setImage(image)
					.setColor(Colors.Green);
				await modalInteraction.update({ attachments: [], components: [], embeds: [embed] });
			}

		}
		catch {
			embed
				.setTitle(`Nobody guessed **${cosmetic.name}**`)
				.setImage(image)
				.setColor(Colors.Red);
			await interaction.editReply({ attachments: [], components: [], embeds: [embed] });
		}
		collector.stop();
	}
});