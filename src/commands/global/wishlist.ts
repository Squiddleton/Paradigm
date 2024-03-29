import { SlashCommand } from '@squiddleton/discordjs-util';
import { normalize } from '@squiddleton/util';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, type ButtonInteraction, ButtonStyle, ComponentType, chatInputApplicationCommandMention, italic } from 'discord.js';
import guildModel from '../../models/guilds.js';
import { DiscordIds, Time } from '../../util/constants.js';
import { getCosmetics, viewWishlist } from '../../util/fortnite.js';
import { messageComponentCollectorFilter } from '../../util/functions.js';
import { addToWishlist, getUser, removeFromWishlist, saveUser } from '../../util/users.js';

export default new SlashCommand({
	name: 'wishlist',
	description: 'Various methods with Fortnite item shop wishlists',
	options: [
		{
			name: 'add',
			description: 'Add a cosmetic to be pinged when it appears in the item shop',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'cosmetic',
					description: 'The name of the cosmetic',
					type: ApplicationCommandOptionType.String,
					required: true,
					autocomplete: true
				}
			]
		},
		{
			name: 'clear',
			description: 'Removes all cosmetics from your wishlist',
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: 'remove',
			description: 'Remove a cosmetic from your wishlist',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'cosmetic',
					description: 'The cosmetic to remove',
					type: ApplicationCommandOptionType.String,
					required: true,
					autocomplete: true
				}
			]
		},
		{
			name: 'view',
			description: 'View the cosmetics in your wishlist',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					description: 'The user whose wishlist you\'re checking; defaults to yourself',
					type: ApplicationCommandOptionType.User
				}
			]
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();
		const userId = interaction.user.id;

		switch (interaction.options.getSubcommand()) {
			case 'add': {
				const cosmetic = getCosmetics().find(c => [normalize(c.id), normalize('name' in c ? c.name ?? c.id : c.title)].includes(normalize(interaction.options.getString('cosmetic', true))));
				if (cosmetic === undefined) {
					await interaction.editReply({ content: 'I could not find a cosmetic with that name.' });
					return;
				}

				const cosmeticName = 'name' in cosmetic ? cosmetic.name : cosmetic.title;
				const userResult = getUser(userId);
				await addToWishlist(userId, cosmetic.id);

				if (userResult?.wishlistCosmeticIds.includes(cosmetic.id)) {
					await interaction.editReply({ content: `${cosmeticName} is already on your wishlist.` });
				}
				else {
					const limitedTag = cosmetic.gameplayTags?.find(tag => ['SeasonShop', 'BattlePass', 'LimitedTimeReward'].some(phrase => tag.includes(phrase)));
					await interaction.editReply(`${cosmeticName} has been added to your wishlist.${(limitedTag === undefined || (cosmetic.shopHistory !== null && cosmetic.shopHistory.length > 0)) ? '' : italic(`\nWarning: This cosmetic has the gameplay tag "${limitedTag}" which implies that it may never appear in the item shop.`)}`);
				}

				if (interaction.inCachedGuild()) {
					const guildResult = await guildModel.findById(interaction.guildId);
					if (guildResult === null || guildResult.wishlistChannelId === null) {
						await interaction.followUp({ content: `Please note that this server does not have a wishlist channel set up. By default, members with the Manage Server permission can use ${chatInputApplicationCommandMention('settings', 'edit', DiscordIds.CommandId.Settings)} to set one.`, ephemeral: true });
					}
					else if (!interaction.guild.channels.cache.has(guildResult.wishlistChannelId)) {
						guildResult.wishlistChannelId = null;
						await guildResult.save();
						await interaction.followUp({ content: `The server's configured wishlist channel no longer exists. By default, members with the Manage Server permission can use ${chatInputApplicationCommandMention('settings', 'edit', DiscordIds.CommandId.Settings)} to set a new one.`, ephemeral: true });
					}
				}
				break;
			}
			case 'clear': {
				const userResult = getUser(userId);
				if (userResult === null || userResult.wishlistCosmeticIds.length === 0) {
					await interaction.editReply({ content: 'You have not added any cosmetics into your wishlist.' });
					return;
				}
				const cosmeticCount = userResult.wishlistCosmeticIds.length;

				const row = new ActionRowBuilder<ButtonBuilder>()
					.setComponents(
						new ButtonBuilder()
							.setLabel('Confirm')
							.setCustomId('confirm')
							.setStyle(ButtonStyle.Danger),
						new ButtonBuilder()
							.setLabel('Cancel')
							.setCustomId('cancel')
							.setStyle(ButtonStyle.Secondary)
					);
				const message = await interaction.editReply({ components: [row], content: `Are you sure you want to remove ${cosmeticCount === 1 ? 'the only cosmetic' : cosmeticCount === 2 ? 'both cosmetics' : `all ${cosmeticCount} cosmetics`} from your wishlist? This action is irreversible.` });
				let buttonInteraction: ButtonInteraction;
				try {
					buttonInteraction = await message.awaitMessageComponent({ componentType: ComponentType.Button, filter: messageComponentCollectorFilter(interaction), time: Time.CollectorDefault });
				}
				catch (error) {
					await interaction.editReply({ components: [], content: 'Ran out of time; the command has been cancelled.' });
					return;
				}

				switch (buttonInteraction.customId) {
					case 'cancel': {
						await buttonInteraction.update({ components: [], content: 'The command has been cancelled.' });
						return;
					}
					case 'confirm': {
						await buttonInteraction.deferUpdate();
						userResult.wishlistCosmeticIds = [];
						await saveUser(userResult);
						await buttonInteraction.editReply({ components: [], content: 'Your wishlist has been cleared.' });
					}
				}
				break;
			}
			case 'remove': {
				const cosmetic = getCosmetics().find(c => [normalize(c.id), normalize('name' in c ? c.name ?? c.id : c.title)].includes(normalize(interaction.options.getString('cosmetic', true))));
				if (cosmetic === undefined) {
					await interaction.editReply({ content: 'I could not find a cosmetic with that name.' });
					return;
				}

				const userResult = getUser(userId);
				if (userResult === null) {
					await interaction.editReply({ content: 'You have not added any cosmetics into your wishlist.' });
					return;
				}
				if (!userResult.wishlistCosmeticIds.includes(cosmetic.id)) {
					await interaction.editReply({ content: 'I could not find a cosmetic with that name in your wishlist.' });
					return;
				}

				await removeFromWishlist(userId, cosmetic.id);
				await interaction.editReply(`${'name' in cosmetic ? cosmetic.name : cosmetic.title} has been removed from your wishlist.`);
				break;
			}
			case 'view': {
				await viewWishlist(interaction);
				break;
			}
		}
	}
});