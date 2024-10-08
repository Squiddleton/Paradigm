import { createCanvas, loadImage } from '@napi-rs/canvas';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { getRandomItem } from '@squiddleton/util';
import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { BackgroundURL } from '../../util/constants.js';
import { createCosmeticEmbed, getBRCosmetics, getCosmeticLargeIcon } from '../../util/fortnite.js';

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
		const cosmetics = getBRCosmetics();
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

		const outfitIcon = getCosmeticLargeIcon(outfit);
		if (outfitIcon === null) {
			await interaction.editReply('Your Outfit has no image; please try a different one!');
			return;
		}
		const outfitImage = await loadImage(outfitIcon);
		ctx.drawImage(outfitImage, (background.width - (background.height * outfitImage.width / outfitImage.height)) / 2, 0, background.height * outfitImage.width / outfitImage.height, background.height);

		const backBlingIcon = getCosmeticLargeIcon(backBling);
		if (backBlingIcon === null) {
			await interaction.editReply('Your Back Bling has no image; please try a different one!');
			return;
		}
		const backBlingImage = await loadImage(backBlingIcon);
		ctx.drawImage(backBlingImage, 0, 0, background.height * backBlingImage.width / backBlingImage.height / 2, background.height / 2);

		const pickaxeIcon = getCosmeticLargeIcon(pickaxe);
		if (pickaxeIcon === null) {
			await interaction.editReply('Your Pickaxe has no image; please try a different one!');
			return;
		}
		const pickaxeImage = await loadImage(pickaxeIcon);
		ctx.drawImage(pickaxeImage, 0, background.height / 2, background.height * pickaxeImage.width / pickaxeImage.height / 2, background.height / 2);

		const gliderIcon = getCosmeticLargeIcon(glider);
		if (gliderIcon === null) {
			await interaction.editReply('Your Glider has no image; please try a different one!');
			return;
		}
		const gliderImage = await loadImage(gliderIcon);
		ctx.drawImage(gliderImage, background.width - (background.height * gliderImage.width / gliderImage.height / 2), 0, background.height * gliderImage.width / gliderImage.height / 2, background.height / 2);

		const wrapIcon = getCosmeticLargeIcon(wrap);
		if (wrapIcon === null) {
			await interaction.editReply('Your Wrap has no image; please try a different one!');
			return;
		}
		const wrapImage = await loadImage(wrapIcon);
		ctx.drawImage(wrapImage, background.width - (background.height * wrapImage.width / wrapImage.height / 2), background.height / 2, background.height * wrapImage.width / wrapImage.height / 2, background.height / 2);

		const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'loadout.png' });

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
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