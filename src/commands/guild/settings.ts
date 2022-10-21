import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import guildSchema from '../../schemas/guilds.js';
import { TimestampedEmbed } from '../../util/classes.js';
import { AccessibleChannelPermissions, ErrorMessage, TextBasedChannelTypes } from '../../util/constants.js';

export default new SlashCommand({
	name: 'settings',
	description: 'Various methods with server settings',
	options: [
		{
			name: 'edit',
			description: 'Edit the bot\'s settings in this server',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'wishlistchannel',
					description: 'The channel to send wishlist notifications in',
					type: ApplicationCommandOptionType.Channel,
					channelTypes: TextBasedChannelTypes
				}
			]
		},
		{
			name: 'view',
			description: 'View the bot\'s settings in this server',
			type: ApplicationCommandOptionType.Subcommand
		}
	],
	permissions: PermissionFlagsBits.ManageGuild,
	scope: 'Guild',
	async execute(interaction, client) {
		if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);
		const { guildId } = interaction;
		switch (interaction.options.getSubcommand()) {
			case 'edit': {
				const wishlistChannel = interaction.options.getChannel('wishlistchannel');
				if (wishlistChannel === null) {
					await interaction.reply({ content: 'No server settings were changed.', ephemeral: true });
					return;
				}

				const permissions = wishlistChannel.permissionsFor(client.user);
				if (permissions === null) throw new Error(ErrorMessage.UncachedClient);
				if (!permissions.has(AccessibleChannelPermissions)) {
					await interaction.reply({ content: 'I need the View Channel and Send Messages permissions in that channel before it can be set.', ephemeral: true });
					return;
				}

				await guildSchema.findByIdAndUpdate(guildId, { wishlistChannelId: wishlistChannel.id }, { upsert: true });
				await interaction.reply({ content: `You have set the new wishlist notification channel to ${wishlistChannel}.`, ephemeral: true });
				return;
			}
			case 'view': {
				const guildResult = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				const { wishlistChannelId } = guildResult;

				await interaction.reply({
					embeds: [
						new TimestampedEmbed()
							.setTitle(`${interaction.guild.name} Server Settings`)
							.setThumbnail(interaction.guild.iconURL())
							.setFields(
								{ name: 'Total Giveaways', value: guildResult.giveaways.length.toString(), inline: true },
								{ name: 'Total Milestones', value: guildResult.milestones.length.toString(), inline: true },
								{ name: 'Wishlist Channel', value: wishlistChannelId === null ? 'None' : `<#${wishlistChannelId}>`, inline: true }
							)
					],
					ephemeral: true
				});
			}
		}
	}
});