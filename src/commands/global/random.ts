import { createCanvas, loadImage } from '@napi-rs/canvas';
import { SlashCommand } from '@squiddleton/discordjs-util';
import type { Cosmetic } from '@squiddleton/fortnite-api';
import { getRandomItem } from '@squiddleton/util';
import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js';
import { TimestampedEmbed } from '../../util/classes.js';
import { BackgroundURL } from '../../util/constants.js';
import { createCosmeticEmbed, fetchCosmetics } from '../../util/fortnite.js';

const getImage = (cosmetic: Cosmetic) => cosmetic.images.featured ? cosmetic.images.featured : cosmetic.images.icon;

export default new SlashCommand({
	name: 'random',
	description: 'Generate an image or display info about random Fortnite cosmetics',
	options: [
		{
			name: 'type',
			description: 'A specific type of cosmetic to choose; defaults to a collection of multiple types',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'Outfit', value: 'outfit' },
				{ name: 'Back Bling', value: 'backpack' },
				{ name: 'Emote', value: 'emote' },
				{ name: 'Glider', value: 'glider' },
				{ name: 'Emoticon', value: 'emoji' },
				{ name: 'Loading Screen', value: 'loadingscreen' },
				{ name: 'Pickaxe', value: 'pickaxe' },
				{ name: 'Contrail', value: 'contrail' },
				{ name: 'Spray', value: 'spray' },
				{ name: 'Toy', value: 'toy' },
				{ name: 'Pet', value: 'petcarrier' },
				{ name: 'Music', value: 'music' },
				{ name: 'Wrap', value: 'wrap' },
				{ name: 'Banner', value: 'banner' }
			]
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();
		const cosmetics = await fetchCosmetics();
		const type = interaction.options.getString('type');
		if (type) {
			await interaction.editReply({ embeds: [createCosmeticEmbed(getRandomItem(cosmetics.filter(c => c.type.value === type)))] });
			return;
		}

		const backBling = getRandomItem(cosmetics.filter(c => c.type.displayValue === 'Back Bling'));
		const glider = getRandomItem(cosmetics.filter(c => c.type.displayValue === 'Glider'));
		const pickaxe = getRandomItem(cosmetics.filter(c => c.type.value === 'pickaxe'));
		const wrap = getRandomItem(cosmetics.filter(c => c.type.displayValue === 'Wrap'));
		const outfit = getRandomItem(cosmetics.filter(c => c.type.displayValue === 'Outfit'));

		const background = await loadImage(getRandomItem(Object.values(BackgroundURL)));
		const canvas = createCanvas(background.width, background.height);
		const ctx = canvas.getContext('2d');
		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

		const outfitImage = await loadImage(getImage(outfit));
		ctx.drawImage(outfitImage, (background.width - (background.height * outfitImage.width / outfitImage.height)) / 2, 0, background.height * outfitImage.width / outfitImage.height, background.height);

		const backBlingImage = await loadImage(getImage(backBling));
		ctx.drawImage(backBlingImage, 0, 0, background.height * backBlingImage.width / backBlingImage.height / 2, background.height / 2);

		const pickaxeImage = await loadImage(getImage(pickaxe));
		ctx.drawImage(pickaxeImage, 0, background.height / 2, background.height * pickaxeImage.width / pickaxeImage.height / 2, background.height / 2);

		const gliderImage = await loadImage(getImage(glider));
		ctx.drawImage(gliderImage, background.width - (background.height * gliderImage.width / gliderImage.height / 2), 0, background.height * gliderImage.width / gliderImage.height / 2, background.height / 2);

		const wrapImage = await loadImage(getImage(wrap));
		ctx.drawImage(wrapImage, background.width - (background.height * wrapImage.width / wrapImage.height / 2), background.height / 2, background.height * wrapImage.width / wrapImage.height / 2, background.height / 2);


		const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'loadout.png' });

		await interaction.editReply({
			embeds: [
				new TimestampedEmbed()
					.setTitle('Randomly Generated Loadout')
					.setImage('attachment://loadout.png')
					.setFields(
						{ name: 'Outfit', value: outfit.name, inline: true },
						{ name: 'Back Bling', value: backBling.name, inline: true },
						{ name: 'Pickaxe', value: pickaxe.name, inline: true },
						{ name: 'Glider', value: glider.name, inline: true },
						{ name: 'Wrap', value: wrap.name, inline: true }
					)
			],
			files: [attachment]
		});
	}
});