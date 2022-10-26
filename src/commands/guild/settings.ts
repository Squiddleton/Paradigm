import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, GuildBasedChannel, PermissionFlagsBits } from 'discord.js';
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
					name: 'shopsectionschannel',
					description: 'The channel to send shop section updates in',
					type: ApplicationCommandOptionType.Channel,
					channelTypes: TextBasedChannelTypes
				},
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
				const shopSectionsChannel = interaction.options.getChannel('shopsectionschannel');
				const wishlistChannel = interaction.options.getChannel('wishlistchannel');
				if (shopSectionsChannel === null && wishlistChannel === null) {
					await interaction.reply({ content: 'No server settings were changed.', ephemeral: true });
					return;
				}

				await interaction.deferReply({ ephemeral: true });
				const setChannel = async (channel: GuildBasedChannel, type: string, idName: string) => {
					const permissions = channel.permissionsFor(client.user);
					if (permissions === null) throw new Error(ErrorMessage.UncachedClient);
					if (!permissions.has(AccessibleChannelPermissions)) {
						await interaction.followUp({ content: `I need the View Channel and Send Messages permissions in ${channel} to set it up for ${type}.`, ephemeral: true });
						return;
					}

					await guildSchema.findByIdAndUpdate(guildId, { [idName]: channel.id }, { upsert: true });
					await interaction.followUp({ content: `You have set the new ${type} channel to ${channel}.`, ephemeral: true });
				};
				if (shopSectionsChannel !== null) {
					await setChannel(shopSectionsChannel, 'shop section updates', 'shopSectionsChannelId');
				}
				if (wishlistChannel !== null) {
					await setChannel(wishlistChannel, 'wishlist notifications', 'wishlistChannelId');
				}

				break;
			}
			case 'view': {
				const guildResult = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				const { shopSectionsChannelId, wishlistChannelId } = guildResult;

				await interaction.reply({
					embeds: [
						new TimestampedEmbed()
							.setTitle(`${interaction.guild.name} Server Settings`)
							.setThumbnail(interaction.guild.iconURL())
							.setFields(
								{ name: 'Total Giveaways', value: guildResult.giveaways.length.toString(), inline: true },
								{ name: 'Total Milestones', value: guildResult.milestones.length.toString(), inline: true },
								{ name: 'Shop Sections Channel', value: shopSectionsChannelId === null ? 'None' : `<#${shopSectionsChannelId}>`, inline: true },
								{ name: 'Wishlist Channel', value: wishlistChannelId === null ? 'None' : `<#${wishlistChannelId}>`, inline: true }
							)
					],
					ephemeral: true
				});
			}
		}
	}
});