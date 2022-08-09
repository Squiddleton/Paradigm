import Canvas from 'canvas';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, Colors, ComponentType, EmbedBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from 'discord.js';
import { SlashCommand } from '../../types/types.js';
import { cosmetics } from '../../util/fortnite.js';
import { noPunc, randomFromArray } from '../../util/functions.js';

export default new SlashCommand({
	name: 'guess',
	description: 'Guess a Fortnite Outfit\'s name from its silhouette',
	scope: 'Global',
	async execute(interaction) {
		const items = cosmetics.filter(i => i.type.displayValue === 'Outfit' && i.name !== 'TBD');
		const cosmetic = randomFromArray(items);
		const image = cosmetic.images.featured ?? cosmetic.images.icon;

		const background = await Canvas.loadImage(image);
		const canvas = Canvas.createCanvas(background.width, background.height);
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

		const color = {
			'Common': 0xbebdb7,
			'Uncommon': 0x1edd1d,
			'Rare': 0x4e5afe,
			'Epic': 0xa745cf,
			'Legendary': 0xf76b11,
			'Mythic': 0xfadb4b,
			'Exotic': 0x7afff4
		}[cosmetic.rarity.displayValue];

		const embed = new EmbedBuilder()
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

		const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
		collector.on('collect', async buttonInteraction => {
			await buttonInteraction.showModal(modal);
		});

		const filter = (i: ModalSubmitInteraction) => {
			if (i.customId !== interaction.id) return false;
			if (noPunc(i.fields.getTextInputValue('outfit')) === noPunc(cosmetic.name)) return true;
			i.reply({ content: 'Your guess is incorrect.', ephemeral: true });
			return false;
		};

		try {
			const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });

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