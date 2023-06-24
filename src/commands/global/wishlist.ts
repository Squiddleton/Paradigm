import { SlashCommand } from '@squiddleton/discordjs-util';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, type ButtonInteraction, ButtonStyle, ComponentType } from 'discord.js';
import guildModel from '../../models/guilds.js';
import userModel from '../../models/users.js';
import { Time } from '../../util/constants.js';
import { findCosmetic, viewWishlist } from '../../util/fortnite.js';
import { messageComponentCollectorFilter } from '../../util/functions.js';

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
				const cosmetic = await findCosmetic(interaction.options.getString('cosmetic', true));
				if (cosmetic === null) {
					await interaction.editReply({ content: 'I could not find a cosmetic with that name.' });
					return;
				}

				const userResult = await userModel.findByIdAndUpdate(
					userId,
					{ $addToSet: { wishlistCosmeticIds: cosmetic.id } },
					{ upsert: true }
				);
				userResult?.wishlistCosmeticIds.includes(cosmetic.id)
					? await interaction.editReply({ content: `${cosmetic.name} is already on your wishlist.` })
					: await interaction.editReply(`${cosmetic.name} has been added to your wishlist.`);

				if (interaction.inCachedGuild()) {
					const guildResult = await guildModel.findById(interaction.guildId);
					if (guildResult === null || guildResult.wishlistChannelId === null) {
						await interaction.followUp({ content: 'Please note that this server does not have a wishlist channel set up. By default, members with the Manage Server permission can use </settings edit:1001289651862118471> to set one.', ephemeral: true });
					}
					else if (!interaction.guild.channels.cache.has(guildResult.wishlistChannelId)) {
						guildResult.wishlistChannelId = null;
						await guildResult.save();
						await interaction.followUp({ content: 'The server\'s configured wishlist channel no longer exists. By default, members with the Manage Server permission can use </settings edit:1001289651862118471> to set a new one.', ephemeral: true });
					}
				}
				break;
			}
			case 'clear': {
				const userResult = await userModel.findById(userId);
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
							.setStyle(ButtonStyle.Primary),
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
						await userResult.save();
						await buttonInteraction.editReply({ components: [], content: 'Your wishlist has been cleared.' });
					}
				}
				break;
			}
			case 'remove': {
				const cosmetic = await findCosmetic(interaction.options.getString('cosmetic', true));
				if (cosmetic === null) {
					await interaction.editReply({ content: 'I could not find a cosmetic with that name.' });
					return;
				}

				const userResult = await userModel.findById(userId);
				if (userResult === null) {
					await interaction.editReply({ content: 'You have not added any cosmetics into your wishlist.' });
					return;
				}
				if (!userResult.wishlistCosmeticIds.includes(cosmetic.id)) {
					await interaction.editReply({ content: 'I could not find a cosmetic with that name in your wishlist.' });
					return;
				}

				await userModel.findByIdAndUpdate(
					userId,
					{ $pull: { wishlistCosmeticIds: cosmetic.id } }
				);
				await interaction.editReply(`${cosmetic.name} has been removed from your wishlist.`);
				break;
			}
			case 'view': {
				await viewWishlist(interaction);
				break;
			}
		}
	}
});