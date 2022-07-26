import { createCanvas, loadImage } from '@napi-rs/canvas';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { getRandomItem, normalize } from '@squiddleton/util';
import { ApplicationCommandOptionType, AttachmentBuilder } from 'discord.js';
import { TimestampedEmbed } from '../../util/classes.js';
import { BackgroundURL } from '../../util/constants.js';
import { createCosmeticEmbed, fetchCosmetics } from '../../util/fortnite.js';

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
				{ name: 'Harvesting Tool', value: 'pickaxe' },
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

		const bbs = cosmetics.filter(c => c.type.displayValue === 'Back Bling');
		const bb = getRandomItem(bbs);
		const gliders = cosmetics.filter(c => c.type.displayValue === 'Glider');
		const glider = getRandomItem(gliders);
		const hts = cosmetics.filter(c => c.type.displayValue === 'Harvesting Tool');
		const ht = getRandomItem(hts);
		const ws = cosmetics.filter(c => c.type.displayValue === 'Wrap');
		const wrap = getRandomItem(ws);
		const outfits = cosmetics.filter(c => c.type.displayValue === 'Outfit');
		const outfit = getRandomItem(outfits);

		const background = await loadImage(getRandomItem(Object.values(BackgroundURL)));
		const canvas = createCanvas(background.width, background.height);
		const ctx = canvas.getContext('2d');
		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

		const o = await loadImage(outfit.images.featured ? outfit.images.featured : outfit.images.icon);
		ctx.drawImage(o, (background.width - (background.height * o.width / o.height)) / 2, 0, background.height * o.width / o.height, background.height);

		const b = await loadImage(bb.images.featured ? bb.images.featured : bb.images.icon);
		ctx.drawImage(b, 0, 0, background.height * b.width / b.height / 2, background.height / 2);

		const h = await loadImage(ht.images.featured ? ht.images.featured : ht.images.icon);
		ctx.drawImage(h, 0, background.height / 2, background.height * h.width / h.height / 2, background.height / 2);

		const g = await loadImage(glider.images.featured ? glider.images.featured : glider.images.icon);
		ctx.drawImage(g, background.width - (background.height * g.width / g.height / 2), 0, background.height * g.width / g.height / 2, background.height / 2);

		const w = await loadImage(wrap.images.featured ? wrap.images.featured : wrap.images.icon);
		ctx.drawImage(w, background.width - (background.height * w.width / w.height / 2), background.height / 2, background.height * w.width / w.height / 2, background.height / 2);

		const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: `${normalize(interaction.user.username)}sLoadout.png` });

		await interaction.editReply({
			embeds: [
				new TimestampedEmbed()
					.setTitle('Randomly Generated Loadout')
					.setImage(`attachment://${normalize(interaction.user.username)}sLoadout.png`)
					.setFields([
						{ name: 'Outfit', value: outfit.name, inline: true },
						{ name: 'Back Bling', value: bb.name, inline: true },
						{ name: 'Harvesting Tool', value: ht.name, inline: true },
						{ name: 'Glider', value: glider.name, inline: true },
						{ name: 'Wrap', value: wrap.name, inline: true }
					])
			],
			files: [attachment]
		});
	}
});