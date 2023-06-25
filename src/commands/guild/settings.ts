import { SlashCommand } from '@squiddleton/discordjs-util';
import { ActionRowBuilder, ApplicationCommandOptionType, ChannelSelectMenuBuilder, ComponentType, DiscordAPIError, EmbedBuilder, PermissionFlagsBits, RESTJSONErrorCodes } from 'discord.js';
import guildModel from '../../models/guilds.js';
import { DiscordClient } from '../../util/classes.js';
import { AccessibleChannelPermissions, ErrorMessage, TextBasedChannelTypes, Time } from '../../util/constants.js';
import { messageComponentCollectorFilter } from '../../util/functions.js';

export default new SlashCommand({
	name: 'settings',
	description: 'Various methods with server settings',
	options: [
		{
			name: 'edit',
			description: 'Edit the bot\'s settings in this server',
			type: ApplicationCommandOptionType.Subcommand
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
		DiscordClient.assertReadyClient(client);
		const { guildId } = interaction;
		switch (interaction.options.getSubcommand()) {
			case 'edit': {
				const shopSectionsMenu = new ChannelSelectMenuBuilder()
					.setChannelTypes(TextBasedChannelTypes)
					.setCustomId('shopSectionsChannelId')
					.setPlaceholder('Leaked Shop Sections')
					.setMinValues(0);
				const wishlistMenu = new ChannelSelectMenuBuilder()
					.setChannelTypes(TextBasedChannelTypes)
					.setCustomId('wishlistChannelId')
					.setPlaceholder('Wishlist Notifications')
					.setMinValues(0);

				const shopSectionsRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(shopSectionsMenu);
				const wishlistRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().setComponents(wishlistMenu);
				const message = await interaction.reply({ components: [shopSectionsRow, wishlistRow], content: 'Select the channels for the following automatic messages.' });

				const collector = message.createMessageComponentCollector({ componentType: ComponentType.ChannelSelect, filter: messageComponentCollectorFilter(interaction), time: Time.CollectorDefault });
				collector
					.on('collect', async channelInteraction => {
						const { customId } = channelInteraction;
						const channel = channelInteraction.channels.first();
						if (channel === undefined) {
							await guildModel.findByIdAndUpdate(guildId, { [customId]: null }, { upsert: true });
							await channelInteraction.reply({ content: 'That channel has been unset.', ephemeral: true });
							return;
						}
						else if (channel.isDMBased()) {
							throw new Error(`The channel ${channel.id} is from a DM.`);
						}
						const permissions = client.getPermissions(channel);
						if (customId === 'wishlistChannelId' && !permissions.has(AccessibleChannelPermissions)) {
							await channelInteraction.reply({ content: `I need the View Channel and Send Messages permissions in ${channel} to set it.`, ephemeral: true });
							return;
						}
						else if (customId === 'shopSectionsChannelId' && !permissions.has([...AccessibleChannelPermissions, PermissionFlagsBits.EmbedLinks])) {
							await channelInteraction.reply({ content: `I need the View Channel, Send Messages, and Embed Links permissions in ${channel} to set it.`, ephemeral: true });
							return;
						}

						await guildModel.findByIdAndUpdate(guildId, { [customId]: channel.id }, { upsert: true });
						await channelInteraction.reply({ content: 'That channel has been set.', ephemeral: true });
					})
					.once('end', async () => {
						try {
							await interaction.deleteReply();
						}
						catch (error) {
							if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.UnknownMessage) throw error;
						}
					});
				break;
			}
			case 'view': {
				const { giveaways, milestones, shopSectionsChannelId, wishlistChannelId } = await guildModel.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setTitle(`${interaction.guild.name} Server Settings`)
							.setThumbnail(interaction.guild.iconURL())
							.setFields(
								{ name: 'Total Giveaways', value: giveaways.length.toString(), inline: true },
								{ name: 'Total Milestones', value: milestones.length.toString(), inline: true },
								{ name: 'Leaked Shop Sections', value: shopSectionsChannelId === null ? 'No Channel Set' : `<#${shopSectionsChannelId}>`, inline: true },
								{ name: 'Wishlist Notifications', value: wishlistChannelId === null ? 'No Channel Set' : `<#${wishlistChannelId}>`, inline: true }
							)
					],
					ephemeral: true
				});
			}
		}
	}
});