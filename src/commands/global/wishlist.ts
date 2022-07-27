import { ApplicationCommandOptionType, ChatInputCommandInteraction, Colors, EmbedBuilder, Snowflake } from 'discord.js';

import userSchema from '../../schemas/users.js';
import { noPunc } from '../../util/functions.js';
import { itemShopCosmetics } from '../../util/fortnite.js';
import { Scope, SlashCommand } from '../../types/types.js';

interface UserProperties {
	id: Snowflake;
	username: string;
	color: number;
	avatar: string;
	same: boolean;
}
const getUserProperties = async (interaction: ChatInputCommandInteraction): Promise<UserProperties> => {
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
	description: 'Various methods involving Fortnite item shop wishlists',
	options: [
		{
			name: 'add',
			description: 'Add a cosmetic to get pinged when it appears in the item shop',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'cosmetic',
					description: 'The cosmetic to listen for',
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
	scope: Scope.Global,
	async execute(interaction) {
		const userId = interaction.user.id;

		switch (interaction.options.getSubcommand()) {
			case 'add': {
				const input = interaction.options.getString('cosmetic', true);
				const cosmetic = itemShopCosmetics.find(c => c.id === input) ?? itemShopCosmetics.find(c => input.includes(c.id)) ?? itemShopCosmetics.find(c => noPunc(c.name) === noPunc(input));
				if (cosmetic === undefined) {
					await interaction.reply({ content: 'No cosmetic matches the option provided.', ephemeral: true });
					return;
				}

				await userSchema.findByIdAndUpdate(
					userId,
					{ $push: { wishlistCosmeticIds: cosmetic.id } },
					{ upsert: true }
				);
				await interaction.reply(`${cosmetic.name} has been added to your wishlist.`);
				return;
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
							if (cosmetic === undefined) throw new Error(`A wishlist contains the invalid cosmetic id "${id}"`);
							return `${cosmetic.name} (${cosmetic.type.displayValue})`;
						})
						.sort((a, b) => {
							if (a.startsWith('+ ') && a.endsWith(' more')) return 1;
							return a.localeCompare(b);
						})
						.join('\n'))
					.setThumbnail(user.avatar)
					.setTimestamp()
					.setTitle(`${user.username}'${['s', 'z'].some(l => user.username.endsWith(l)) ? '' : 's'} Wishlist`);
				await interaction.reply({ embeds: [embed], ephemeral: !user.same });
				return;
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
			}
		}
	}
});