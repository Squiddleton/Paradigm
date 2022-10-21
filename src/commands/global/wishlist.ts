import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType } from 'discord.js';
import guildSchema from '../../schemas/guilds.js';
import userSchema from '../../schemas/users.js';
import { findCosmetic, viewWishlist } from '../../util/fortnite.js';

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
		const userId = interaction.user.id;

		switch (interaction.options.getSubcommand()) {
			case 'add': {
				const cosmetic = await findCosmetic(interaction.options.getString('cosmetic', true), true);
				if (cosmetic === null) {
					await interaction.reply({ content: 'No cosmetic matches the option provided.', ephemeral: true });
					return;
				}

				const userResult = await userSchema.findByIdAndUpdate(
					userId,
					{ $addToSet: { wishlistCosmeticIds: cosmetic.id } },
					{ upsert: true }
				);
				userResult?.wishlistCosmeticIds.includes(cosmetic.id)
					? await interaction.reply({ content: `${cosmetic.name} is already on your wishlist.`, ephemeral: true })
					: await interaction.reply(`${cosmetic.name} has been added to your wishlist.`);

				if (interaction.inCachedGuild()) {
					const guildResult = await guildSchema.findById(interaction.guildId);
					if (guildResult === null || guildResult.wishlistChannelId === null) {
						await interaction.followUp({ content: 'Please note that this server does not have a wishlist channel set up. By default, members with the Manage Server permission can use `/settings edit` to set one.', ephemeral: true });
					}
					else if (interaction.guild.channels.cache.get(guildResult.wishlistChannelId) === undefined) {
						await guildSchema.findByIdAndUpdate(interaction.guildId, { wishlistChannelId: null });
						await interaction.followUp({ content: 'The server\'s configured wishlist channel no longer exists. By default, members with the Manage Server permission can use `/settings edit` to set a new one.', ephemeral: true });
					}
				}
				break;
			}
			case 'remove': {
				const cosmetic = await findCosmetic(interaction.options.getString('cosmetic', true), true);
				if (cosmetic === null) {
					await interaction.reply({ content: 'No cosmetic matches the option provided.', ephemeral: true });
					return;
				}

				const userResult = await userSchema.findById(userId);
				if (userResult === null) {
					await interaction.reply({ content: 'You have not added any cosmetics into your wishlist.', ephemeral: true });
					return;
				}
				if (!userResult.wishlistCosmeticIds.includes(cosmetic.id)) {
					await interaction.reply({ content: 'No cosmetic in your wishlist matches the option provided.', ephemeral: true });
					return;
				}

				await userSchema.findByIdAndUpdate(
					userId,
					{ $pull: { wishlistCosmeticIds: cosmetic.id } }
				);
				await interaction.reply(`${cosmetic.name} has been removed from your wishlist.`);
				break;
			}
			case 'view': {
				await viewWishlist(interaction);
				break;
			}
		}
	}
});