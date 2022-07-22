// eslint-disable-next-line no-unused-vars
import { ButtonStyle, ChatInputCommandInteraction, ActionRowBuilder, AttachmentBuilder, ButtonBuilder, EmbedBuilder, SelectMenuBuilder, ComponentType, TextBasedChannel, MessageActionRowComponentBuilder, MessageComponentInteraction, Message, Snowflake } from 'discord.js';
import Canvas from 'canvas';
import fetch from 'node-fetch';
import { noPunc, randomFromArray } from './functions.js';
import milestoneUserSchema from '../schemas/milestoneusers.js';
import wishlistSchema from '../schemas/wishlists.js';
import { Cosmetic, CosmeticAPI, Shop } from '../types/fortniteapi.js';

type StringOption = string | null;

const backgrounds = {
	gold: 'https://cdn.discordapp.com/attachments/713250274214543360/828073686870392842/gold.jpg',
	orange: 'https://cdn.discordapp.com/attachments/713250274214543360/828073689752141874/orange.jpg',
	purple: 'https://cdn.discordapp.com/attachments/713250274214543360/828073688834113566/purple.jpg',
	blue: 'https://cdn.discordapp.com/attachments/713250274214543360/828073694717804584/blue.jpg',
	green: 'https://cdn.discordapp.com/attachments/713250274214543360/828073688074289172/green.jpg'
};
const isBackground = (str: string): str is keyof typeof backgrounds => str in backgrounds;

export const rarityOrdering = {
	Common: 0,
	Uncommon: 1,
	Rare: 2,
	Epic: 3,
	Legendary: 4,
	Mythic: 5
};
export const isRarity = (rarity: string): rarity is keyof typeof rarityOrdering => rarity in rarityOrdering;

export const { data: cosmetics } = await fetch('https://fortnite-api.com/v2/cosmetics/br').then(response => response.json()) as CosmeticAPI;

export const itemShopCosmetics = cosmetics.filter(cosmetic => {
	if (cosmetic.shopHistory?.length) return true;

	return cosmetic.gameplayTags !== null &&
	!cosmetic.gameplayTags.includes('Cosmetics.QuestsMetaData.Season10.Visitor') &&
	!['_Sync', '_Owned', '_Follower'].some(end => cosmetic.id.endsWith(end)) &&
	((cosmetic.gameplayTags.includes('Cosmetics.Source.ItemShop')) ||
	(!['Cosmetics.Source.Promo', 'Cosmetics.Source.Granted.SaveTheWorld', 'Cosmetics.Source.testing', 'Cosmetics.QuestsMetaData.Achievements.Umbrella', 'Cosmetics.Source.MandosBountyLTM'].some(tag => cosmetic.gameplayTags?.includes(tag)) &&
	!cosmetic.gameplayTags.some(tag => ['BattlePass', 'Cosmetics.Source.Event', 'Challenges', 'SeasonShop'].some(word => tag.includes(word))) &&
	!['Recruit', 'null', '[PH] Join Squad'].includes(cosmetic.name)));
});

export const checkWishlists = async (channel: TextBasedChannel) => {
	const entries = await fetchItemShop();
	const wishlists = await wishlistSchema.find();
	const msgs = ['Today\'s shop includes the following items from members\' wishlists:\n'];
	for (const wishlist of wishlists) {
		const items = [...new Set(entries.filter(item => wishlist.cosmeticIds.includes(item.id)).map(item => item.name))];
		if (items.length > 0) {
			msgs.push(`<@${wishlist._id}>: ${items.join(', ')}`);
		}
	}
	if (msgs.length > 1) {
		msgs.push('\nIf you have purchased your item, use the `/wishlist remove` command in <#742803449493717134>.\nDo you want to create your own wishlist?  Check out `/wishlist add`!');
		const msg = msgs.join('\n');
		await channel.send(msg);

		const friendChannel = channel.client.channels.cache.get('703027620555653180');
		if (friendChannel !== undefined && friendChannel.isTextBased()) {
			await friendChannel.send(msg);
		}
	}
};

export const createCosmeticEmbed = (cosmetic: Cosmetic) => {
	const color = {
		'Common': 0xbebdb7,
		'Uncommon': 0x1edd1d,
		'Rare': 0x4e5afe,
		'Epic': 0xa745cf,
		'Legendary': 0xf76b11,
		'Mythic': 0xfadb4b,
		'Exotic': 0x7afff4,
		'Icon Series': 0x10626f,
		'MARVEL SERIES': 0x630303,
		'DC SERIES': 0x101b2a,
		'Star Wars Series': 0x000201,
		'DARK SERIES': 0x25053d,
		'Frozen Series': 0x93c3e0,
		'Lava Series': 0x7c2921,
		'Shadow Series': 0x0f0f0f,
		'Slurp Series': 0x1ac1a4,
		'Gaming Legends Series': 0x1f0937
	}[cosmetic.rarity.displayValue] || 'Random';
	const image = cosmetic.images.featured || cosmetic.images.icon;
	const embed = new EmbedBuilder()
		.setTitle(`${cosmetic.name} (${cosmetic.type.displayValue})`)
		.setColor(color)
		.setThumbnail(cosmetic.images.smallIcon)
		.setImage(image)
		.addFields([
			{ name: 'Description', value: cosmetic.description, inline: true }, { name: 'Set', value: cosmetic.set ? cosmetic.set.value : 'None', inline: true },
			{ name: '\u200B', value: '\u200B' },
			{ name: 'Rarity', value: cosmetic.rarity.displayValue, inline: true }, { name: 'Debut', value: cosmetic.introduction ? `Chapter ${cosmetic.introduction.chapter}, Season ${cosmetic.introduction.season}` : 'N/A', inline: true }
		])
		.setFooter({ text: cosmetic.id });
	if (cosmetic.shopHistory) embed.addFields([{ name: 'Appearances', value: `First: ${cosmetic.shopHistory[0].substring(0, 10)}\nLast: ${cosmetic.shopHistory[cosmetic.shopHistory.length - 1].substring(0, 10)}\nTotal: ${cosmetic.shopHistory.length}` }]);
	if (cosmetic.customExclusiveCallout) embed.setDescription(cosmetic.customExclusiveCallout);
	return embed;
};

export const createLoadoutAttachment = async (outfit: StringOption, backbling: StringOption, harvestingtool: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, links: { Outfit?: string; 'Back Bling'?: string; 'Harvesting Tool'?: string; Glider?: string } = {}) => {
	const rawBackground = chosenBackground === null ? randomFromArray(Object.values(backgrounds)) : chosenBackground;
	const background = await Canvas.loadImage(rawBackground);
	const canvas = Canvas.createCanvas(background.width, background.height);
	const ctx = canvas.getContext('2d');
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	if (links.Outfit) {
		const outfitImg = await Canvas.loadImage(links.Outfit);
		ctx.drawImage(outfitImg, (background.width - (background.height * outfitImg.width / outfitImg.height)) / 2, 0, background.height * outfitImg.width / outfitImg.height, background.height);
	}
	else if (outfit) {
		const o = cosmetics.find(e => e.type.displayValue === 'Outfit' && noPunc(e.name.toLowerCase().replace(/ /g, '')) === noPunc(outfit));
		if (!o) {
			return 'Invalid outfit name provided.';
		}
		const outfitImg = await Canvas.loadImage(o.images.featured ?? o.images.icon);
		ctx.drawImage(outfitImg, (background.width - (background.height * outfitImg.width / outfitImg.height)) / 2, 0, background.height * outfitImg.width / outfitImg.height, background.height);

	}

	if (links['Back Bling']) {
		const bb = await Canvas.loadImage(links['Back Bling']);
		ctx.drawImage(bb, 0, 0, background.height * bb.width / bb.height / 2, background.height / 2);
	}
	else if (backbling) {
		const bi = cosmetics.find(o => ['Back Bling', 'Pet'].some(value => o.type.displayValue === value) && noPunc(o.name.toLowerCase().replace(/ /g, '')) === noPunc(backbling));
		if (!bi) {
			return 'Invalid back bling name provided.';
		}
		const bb = await Canvas.loadImage(bi.images.featured ?? bi.images.icon);
		ctx.drawImage(bb, 0, 0, background.height * bb.width / bb.height / 2, background.height / 2);
	}

	if (links['Harvesting Tool']) {
		const ht = await Canvas.loadImage(links['Harvesting Tool']);
		ctx.drawImage(ht, 0, background.height / 2, background.height * ht.width / ht.height / 2, background.height / 2);
	}
	else if (harvestingtool) {
		const hi = cosmetics.find(o => o.type.displayValue === 'Harvesting Tool' && noPunc(o.name.toLowerCase().replace(/ /g, '')) === noPunc(harvestingtool));
		if (!hi) {
			return 'Invalid harvesting tool name provided.';
		}
		const ht = await Canvas.loadImage(hi.images.featured ?? hi.images.icon);
		ctx.drawImage(ht, 0, background.height / 2, background.height * ht.width / ht.height / 2, background.height / 2);
	}

	if (links.Glider) {
		const gliderImg = await Canvas.loadImage(links.Glider);
		ctx.drawImage(gliderImg, background.width - (background.height * gliderImg.width / gliderImg.height / 2), 0, background.height * gliderImg.width / gliderImg.height / 2, background.height / 2);
	}
	else if (glider) {
		const gi = cosmetics.find(o => o.type.displayValue === 'Glider' && noPunc(o.name.toLowerCase().replace(/ /g, '')) === noPunc(glider));
		if (!gi) {
			return 'Invalid glider name provided.';
		}
		const gliderImg = await Canvas.loadImage(gi.images.featured ?? gi.images.icon);
		ctx.drawImage(gliderImg, background.width - (background.height * gliderImg.width / gliderImg.height / 2), 0, background.height * gliderImg.width / gliderImg.height / 2, background.height / 2);
	}

	if (wrap) {
		const oi = cosmetics.find(o => o.type.displayValue === 'Wrap' && noPunc(o.name.toLowerCase().replace(/ /g, '')) === noPunc(wrap));
		if (!oi) {
			return 'Invalid wrap name provided.';
		}
		const wrapImg = await Canvas.loadImage(oi.images.featured ?? oi.images.icon);
		ctx.drawImage(wrapImg, background.width - (background.height * wrapImg.width / wrapImg.height / 2), background.height / 2, background.height * wrapImg.width / wrapImg.height / 2, background.height / 2);
	}

	return new AttachmentBuilder(canvas.toBuffer(), { name: 'loadout.png' });
};

export const createStyleListeners = async (interaction: ChatInputCommandInteraction, attachment: AttachmentBuilder, outfit: StringOption, backbling: StringOption, harvestingtool: StringOption, glider: StringOption, wrap: StringOption, chosenBackground: StringOption, embeds: EmbedBuilder[]): Promise<void> => {
	if (chosenBackground !== null && !isBackground(chosenBackground)) throw new Error(`The provided background "${chosenBackground}" is not a valid background color`);

	let components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
	if (outfit !== null) {
		const c = cosmetics.find(cosmetic => cosmetic.type.displayValue === 'Outfit' && noPunc(cosmetic.name.toLowerCase().replace(/ /g, '')) === noPunc(outfit));
		if (c) {
			const variants = c.variants?.[0];
			if (variants) {
				components.push(
					new ActionRowBuilder({
						components: [
							new SelectMenuBuilder()
								.setCustomId(c.id)
								.setOptions([
									{ label: 'Default Outfit', value: 'truedefault', default: true },
									...variants.options.map(variant => ({ label: variant.name, value: variant.tag })).slice(0, 24)
								])
								.setMinValues(1)
								.setMaxValues(1)
						]
					})
				);
			}
		}
	}
	if (backbling !== null) {
		const c = cosmetics.find(cosmetic => ['Back Bling', 'Pet'].includes(cosmetic.type.displayValue) && noPunc(cosmetic.name.toLowerCase().replace(/ /g, '')) === noPunc(backbling));
		if (c) {
			const variants = c.variants?.[0];
			if (variants) {
				components.push(
					new ActionRowBuilder({
						components: [
							new SelectMenuBuilder()
								.setCustomId(c.id)
								.setOptions([
									{ label: 'Default Back Bling', value: 'trudefault', default: true },
									...variants.options.map(variant => ({ label: variant.name, value: variant.tag })).slice(0, 24)
								])
								.setMinValues(1)
								.setMaxValues(1)
						]
					})
				);
			}
		}
	}
	if (harvestingtool !== null) {
		const c = cosmetics.find(cosmetic => cosmetic.type.displayValue === 'Harvesting Tool' && noPunc(cosmetic.name.toLowerCase().replace(/ /g, '')) === noPunc(harvestingtool));
		if (c) {
			const variants = c.variants?.[0];
			if (variants) {
				components.push(
					new ActionRowBuilder({
						components: [
							new SelectMenuBuilder()
								.setCustomId(c.id)
								.setOptions([
									{ label: 'Default Pickaxe', value: 'truedefault', default: true },
									...variants.options.map(variant => ({ label: variant.name, value: variant.tag })).slice(0, 24)
								])
								.setMinValues(1)
								.setMaxValues(1)
						]
					})
				);
			}
		}
	}
	if (glider !== null) {
		const c = cosmetics.find(cosmetic => cosmetic.type.displayValue === 'Glider' && noPunc(cosmetic.name.toLowerCase().replace(/ /g, '')) === noPunc(glider));
		if (c) {
			const variants = c.variants?.[0];
			if (variants) {
				components.push(
					new ActionRowBuilder({
						components: [
							new SelectMenuBuilder()
								.setCustomId(c.id)
								.setOptions([
									{ label: 'Default Glider', value: 'truedefault', default: true },
									...variants.options.map(variant => ({ label: variant.name, value: variant.tag })).slice(0, 24)
								])
								.setMinValues(1)
								.setMaxValues(1)
						]
					})
				);
			}
		}
	}
	if (components.length > 0) {
		components.push(
			new ActionRowBuilder({
				components: [
					new ButtonBuilder()
						.setCustomId('confirm')
						.setLabel('Confirm')
						.setStyle(ButtonStyle.Success)
				]
			})
		);
	}
	await interaction.editReply({ components, content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, files: [attachment], embeds });
	if (components.length > 0) {
		const message: Message = await interaction.fetchReply();
		const filter = (i: MessageComponentInteraction) => {
			if (i.user.id === interaction.user.id) return true;
			i.reply({ content: 'Only the command user can use this.', ephemeral: true });
			return false;
		};
		const collector = message.createMessageComponentCollector({ filter, time: 120000 });
		const options: {[key: string]: string} = {};

		collector.on('collect', async i => {
			if (i.customId === 'confirm') {
				await i.update({ components: [], content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, embeds });
				return;
			}
			await i.deferUpdate();

			if (!i.isSelectMenu()) throw new Error('Menu interaction is not a select menu interaction.');
			const value = i.values[0];
			const cosmetic = cosmetics.find(c => c.id === i.customId);
			if (cosmetic) {
				const variants = cosmetic.variants?.[0].options;
				if (variants) {
					const imageURL = value.startsWith('truedefault')
						? cosmetic.images.featured ?? cosmetic.images.icon
						: variants.find(option => option.tag === value)?.image;

					if (imageURL === undefined) throw new Error(`No variant includes a tag with the value "${value}"`);

					options[cosmetic.type.displayValue] = imageURL;
					const newAttachmentBuilder = await createLoadoutAttachment(outfit, backbling, harvestingtool, glider, wrap, chosenBackground, options);
					components = components.map(row => {
						const menu = row.components[0];
						if (menu.data.type === ComponentType.Button || (menu.data.type === ComponentType.SelectMenu && menu.data.custom_id !== cosmetic.id)) return row;

						if (menu instanceof SelectMenuBuilder) {
							menu.setOptions(value.startsWith('truedefault')
								? [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault', default: true }, ...variants.map(variant => ({ label: variant.name, value: variant.tag })).slice(0, 24)]
								: [{ label: `Default ${cosmetic.type.displayValue}`, value: 'truedefault' }, ...variants.map(variant => ({ label: variant.name, value: variant.tag, default: variant.tag === value })).slice(0, 24)]);
						}
						return row.setComponents([menu]);
					});

					await i.editReply({ attachments: [], content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, files: [newAttachmentBuilder], components, embeds });
					return;
				}
			}
		});

		collector.on('end', async (collected, reason) => {
			if (reason === 'time') await interaction.editReply({ components: [], content: embeds.length ? '<https://twitter.com/FortniteGame/status/1068655953699053568>' : null, embeds });
		});
	}
};

export const grantMilestone = async (userId: Snowflake, guildId: Snowflake, milestoneName: string) => {
	const oldUserMilestones = await milestoneUserSchema.findOne({ userId, guildId, milestones: milestoneName });
	if (oldUserMilestones?.milestones.includes(milestoneName)) return false;

	await milestoneUserSchema.updateOne(
		{ userId, guildId },
		{ $push: { milestones: milestoneName } },
		{ upsert: true }
	);
	return true;
};

export const fetchItemShop = async () => {
	const { data: rawAPI } = await fetch('https://fortnite-api.com/v2/shop/br/combined').then(r => r.json()) as Shop;

	const withoutDupes: Cosmetic[] = [];
	const withDupes: Cosmetic[] = rawAPI.featured.entries.concat(rawAPI.daily.entries).map(entry => entry.items).flat();

	for (const item of withDupes) {
		if (!withoutDupes.some(c => c.id === item.id)) {
			withoutDupes.push(item);
		}
	}
	return withoutDupes;
};