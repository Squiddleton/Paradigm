import { SlashCommand } from '@squiddleton/discordjs-util';
import { ActionRowBuilder, ApplicationCommandOptionType, ChannelSelectMenuBuilder, ComponentType, PermissionFlagsBits } from 'discord.js';
import guildSchema from '../../schemas/guilds.js';
import { TimestampedEmbed } from '../../util/classes.js';
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
	async execute(interaction) {
		if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);
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
				collector.on('collect', async channelInteraction => {
					const { customId } = channelInteraction;
					const channel = channelInteraction.channels.first();
					if (channel === undefined) {
						await guildSchema.findByIdAndUpdate(guildId, { [customId]: null }, { upsert: true });
						await channelInteraction.reply({ content: 'That channel has been unset.', ephemeral: true });
						return;
					}
					else if (channel.isDMBased()) {
						throw new Error(`The channel ${channel.id} is from a DM.`);
					}
					const permissions = channel.permissionsFor(interaction.client.user);
					if (permissions === null) throw new Error(ErrorMessage.UncachedClient);
					if (!permissions.has(AccessibleChannelPermissions)) {
						await channelInteraction.reply({ content: `I need the View Channel and Send Messages permissions in ${channel} to set it.`, ephemeral: true });
						return;
					}

					await guildSchema.findByIdAndUpdate(guildId, { [customId]: channel.id }, { upsert: true });
					await channelInteraction.reply({ content: 'That channel has been set.', ephemeral: true });
				});
				collector.on('end', () => {
					interaction.deleteReply();
				});
				break;
			}
			case 'view': {
				const { giveaways, milestones, shopSectionsChannelId, wishlistChannelId } = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				await interaction.reply({
					embeds: [
						new TimestampedEmbed()
							.setTitle(`${interaction.guild.name} Server Settings`)
							.setThumbnail(interaction.guild.iconURL())
							.setFields(
								{ name: 'Total Giveaways', value: giveaways.length.toString(), inline: true },
								{ name: 'Total Milestones', value: milestones.length.toString(), inline: true },
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