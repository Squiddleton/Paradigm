import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { noPunc, randomFromArray } from '../../util/functions.js';
import { cosmetics, createCosmeticEmbed } from '../../util/fortnite.js';
import Canvas from 'canvas';
import { SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'random',
	description: 'Randomly generates an image of cosmetics or shows info on a random cosmetic',
	options: [
		{
			name: 'type',
			type: ApplicationCommandOptionType.String,
			description: 'A specific type of cosmetic to choose; defaults to an image of multiple',
			choices: [
				{
					name: 'Outfit',
					value: 'outfit'
				},
				{
					name: 'Back Bling',
					value: 'backpack'
				},
				{
					name: 'Emote',
					value: 'emote'
				},
				{
					name: 'Glider',
					value: 'glider'
				},
				{
					name: 'Emoticon',
					value: 'emoji'
				},
				{
					name: 'Loading Screen',
					value: 'loadingscreen'
				},
				{
					name: 'Harvesting Tool',
					value: 'pickaxe'
				},
				{
					name: 'Contrail',
					value: 'contrail'
				},
				{
					name: 'Spray',
					value: 'spray'
				},
				{
					name: 'Toy',
					value: 'toy'
				},
				{
					name: 'Pet',
					value: 'petcarrier'
				},
				{
					name: 'Music',
					value: 'music'
				},
				{
					name: 'Wrap',
					value: 'wrap'
				},
				{
					name: 'Banner',
					value: 'banner'
				}
			]
		}
	],
	async execute(interaction) {
		await interaction.deferReply();
		const type = interaction.options.getString('type');
		if (type) {
			await interaction.editReply({ embeds: [createCosmeticEmbed(randomFromArray(cosmetics.filter(i => i.type.value === type)))] });
			return;
		}

		const bbs = cosmetics.filter(i => i.type.displayValue === 'Back Bling');
		const bb = randomFromArray(bbs);
		const gliders = cosmetics.filter(i => i.type.displayValue === 'Glider');
		const glider = randomFromArray(gliders);
		const hts = cosmetics.filter(i => i.type.displayValue === 'Harvesting Tool');
		const ht = randomFromArray(hts);
		const ws = cosmetics.filter(i => i.type.displayValue === 'Wrap');
		const wrap = randomFromArray(ws);
		const outfits = cosmetics.filter(i => i.type.displayValue === 'Outfit');
		const outfit = randomFromArray(outfits);

		const bgs = ['https://cdn.discordapp.com/attachments/713250274214543360/828073686870392842/gold.jpg', 'https://cdn.discordapp.com/attachments/713250274214543360/828073689752141874/orange.jpg', 'https://cdn.discordapp.com/attachments/713250274214543360/828073688834113566/purple.jpg', 'https://cdn.discordapp.com/attachments/713250274214543360/828073694717804584/blue.jpg', 'https://cdn.discordapp.com/attachments/713250274214543360/828073688074289172/green.jpg'];
		const background = await Canvas.loadImage(randomFromArray(bgs));
		const canvas = Canvas.createCanvas(background.width, background.height);
		const ctx = canvas.getContext('2d');
		ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

		const o = await Canvas.loadImage(outfit.images.featured ? outfit.images.featured : outfit.images.icon);
		ctx.drawImage(o, (background.width - (background.height * o.width / o.height)) / 2, 0, background.height * o.width / o.height, background.height);

		const b = await Canvas.loadImage(bb.images.featured ? bb.images.featured : bb.images.icon);
		ctx.drawImage(b, 0, 0, background.height * b.width / b.height / 2, background.height / 2);

		const h = await Canvas.loadImage(ht.images.featured ? ht.images.featured : ht.images.icon);
		ctx.drawImage(h, 0, background.height / 2, background.height * h.width / h.height / 2, background.height / 2);

		const g = await Canvas.loadImage(glider.images.featured ? glider.images.featured : glider.images.icon);
		ctx.drawImage(g, background.width - (background.height * g.width / g.height / 2), 0, background.height * g.width / g.height / 2, background.height / 2);

		const w = await Canvas.loadImage(wrap.images.featured ? wrap.images.featured : wrap.images.icon);
		ctx.drawImage(w, background.width - (background.height * w.width / w.height / 2), background.height / 2, background.height * w.width / w.height / 2, background.height / 2);

		const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: `${noPunc(interaction.user.username)}sLoadout.png` });

		const embed = new EmbedBuilder()
			.setTitle('Randomly Generated Loadout')
			.setImage(`attachment://${noPunc(interaction.user.username)}sLoadout.png`)
			.addFields([
				{
					name: 'Outfit',
					value: outfit.name,
					inline: true
				},
				{
					name: 'Back Bling',
					value: bb.name,
					inline: true
				},
				{
					name: 'Harvesting Tool',
					value: ht.name,
					inline: true
				},
				{
					name: 'Glider',
					value: glider.name,
					inline: true
				},
				{
					name: 'Wrap',
					value: wrap.name,
					inline: true
				}
			]);
		await interaction.editReply({ embeds: [embed], files: [attachment] });
	}
});