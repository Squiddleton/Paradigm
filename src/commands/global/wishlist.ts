import { ApplicationCommandOptionType, ChatInputCommandInteraction, Colors, EmbedBuilder } from 'discord.js';

import userSchema from '../../schemas/users.js';
import { noPunc } from '../../util/functions.js';
import { findCosmetic, itemShopCosmetics } from '../../util/fortnite.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import guildSchema from '../../schemas/guilds.js';
import type { DisplayUserProperties } from '../../types.js';
import { ErrorMessages } from '../../constants.js';

const getUserProperties = async (interaction: ChatInputCommandInteraction): Promise<DisplayUserProperties> => {
	const unfetchedUser = interaction.options.getUser('user') ?? interaction.user;
	// Users must be force-fetched to retrieve banners
	const user = await unfetchedUser.fetch();
	const userId = user.id;
	const isSameUser = interaction.user.id === user.id;
	const userData = {
		id: userId,
		username: user.username,
		color: user.accentColor ?? Colors.Purple,
		avatar: user.displayAvatarURL(),
		same: isSameUser
	};

	// Return as a User if the interaction was received in DMs
	if (!interaction.inCachedGuild()) return userData;

	if (isSameUser) {
		return {
			id: userId,
			username: interaction.member.displayName,
			color: interaction.member.displayColor,
			avatar: interaction.member.displayAvatarURL(),
			same: true
		};
	}

	const mentionedMember = interaction.options.getMember('user');
	if (mentionedMember === null) return userData;

	return {
		id: userId,
		username: mentionedMember.displayName,
		color: mentionedMember.displayColor,
		avatar: mentionedMember.displayAvatarURL(),
		same: false
	};
};

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
			name: 'list',
			description: 'List the cosmetics in your wishlist',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'user',
					description: 'The user whose wishlist you\'re checking; defaults to yourself',
					type: ApplicationCommandOptionType.User
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
		}
	],
	scope: 'Global',
	async execute(interaction) {
		const userId = interaction.user.id;

		switch (interaction.options.getSubcommand()) {
			case 'add': {
				const input = interaction.options.getString('cosmetic', true);
				const cosmetic = findCosmetic(input, true);
				if (cosmetic === null) {
					await interaction.reply({ content: 'No cosmetic matches the option provided.', ephemeral: true });
					return;
				}

				const result = await userSchema.findByIdAndUpdate(
					userId,
					{ $addToSet: { wishlistCosmeticIds: cosmetic.id } },
					{ upsert: true }
				);
				result?.wishlistCosmeticIds.includes(cosmetic.id)
					? await interaction.reply({ content: `${cosmetic.name} is already on your wishlist.`, ephemeral: true })
					: await interaction.reply(`${cosmetic.name} has been added to your wishlist.`);

				if (interaction.inCachedGuild()) {
					const guild = await guildSchema.findById(interaction.guildId);
					if (guild === null || guild.wishlistChannelId === null) {
						await interaction.followUp({ content: 'Please note that this server does not have a wishlist channel set up. By default, members with the Manage Server permission can use `/settings edit` to set one.', ephemeral: true });
					}
					else if (interaction.guild.channels.cache.get(guild.wishlistChannelId) === undefined) {
						await guildSchema.findByIdAndUpdate(interaction.guildId, { wishlistChannelId: null });
						await interaction.followUp({ content: 'The server\'s configured wishlist channel no longer exists. By default, members with the Manage Server permission can use `/settings edit` to set a new one.', ephemeral: true });
					}
				}
				break;
			}
			case 'list': {
				const user = await getUserProperties(interaction);

				const wishlist = await userSchema.findById(user.id);
				if (!wishlist?.wishlistCosmeticIds.length) {
					await interaction.reply({ content: user.same ? 'You have not added any cosmetics into your wishlist.' : `${user.username} has an empty wishlist.`, ephemeral: true });
					return;
				}

				const embed = new EmbedBuilder()
					.setColor(user.color)
					.setDescription(wishlist.wishlistCosmeticIds
						.slice(0, 25)
						.map((id, index) => {
							if (index === 24 && wishlist.wishlistCosmeticIds.length !== 25) return `+ ${wishlist.wishlistCosmeticIds.length - 24} more`;

							const cosmetic = itemShopCosmetics.find(c => c.id === id);
							if (cosmetic === undefined) throw new Error(ErrorMessages.UnexpectedValue.replace('{value}', id));
							return `${cosmetic.name} (${cosmetic.type.displayValue})`;
						})
						.sort((a, b) => {
							if (a.startsWith('+ ') && a.endsWith(' more')) return 1;
							return a.localeCompare(b);
						})
						.join('\n'))
					.setThumbnail(user.avatar)
					.setTitle(`${user.username}'${['s', 'z'].some(l => user.username.endsWith(l)) ? '' : 's'} Wishlist`)
					.setTimestamp();
				await interaction.reply({ embeds: [embed], ephemeral: !user.same });
				break;
			}
			case 'remove': {
				const input = interaction.options.getString('cosmetic', true);
				const cosmetic = itemShopCosmetics.find(c => c.id === input) ?? itemShopCosmetics.find(c => noPunc(c.name) === noPunc(input));
				if (cosmetic === undefined) {
					await interaction.reply({ content: 'No cosmetic matches the option provided.', ephemeral: true });
					return;
				}

				const wishlist = await userSchema.findById(userId);
				if (!wishlist) {
					await interaction.reply({ content: 'You have not added any cosmetics into your wishlist.', ephemeral: true });
					return;
				}
				if (!wishlist.wishlistCosmeticIds.includes(cosmetic.id)) {
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
		}
	}
});