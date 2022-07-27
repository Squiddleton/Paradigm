import { ApplicationCommandOptionType, ChannelType, EmbedBuilder } from 'discord.js';
import { Scope, SlashCommand } from '../../types/types.js';
import guildSchema from '../../schemas/guilds.js';

export default new SlashCommand({
	name: 'settings',
	description: 'Various methods involving server settings',
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
					channelTypes: [ChannelType.GuildNews, ChannelType.GuildText, ChannelType.GuildVoice]
				}
			]
		},
		{
			name: 'view',
			description: 'View the bot\'s settings in this server',
			type: ApplicationCommandOptionType.Subcommand
		}
	],
	scope: Scope.Guild,
	async execute(interaction) {
		if (!interaction.inCachedGuild()) throw new Error(`The /${this.name} command should only be usable in guilds`);
		const { guildId } = interaction;
		switch (interaction.options.getSubcommand()) {
			case 'edit': {
				const wishlistChannel = interaction.options.getChannel('wishlistchannel');
				if (wishlistChannel === null) {
					await interaction.reply({ content: 'No server settings were changed.', ephemeral: true });
					return;
				}
				await guildSchema.findByIdAndUpdate(guildId, { wishlistChannelId: wishlistChannel.id }, { upsert: true });
				await interaction.reply({ content: `You have set the new wishlist notification channel to ${wishlistChannel}.`, ephemeral: true });
				return;
			}
			case 'view': {
				const result = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				const { wishlistChannelId } = result;
				const embed = new EmbedBuilder()
					.setTitle(`${interaction.guild.name} Server Settings`)
					.setThumbnail(interaction.guild.iconURL())
					.setFields(
						{ name: 'Total Giveaways', value: result.giveaways.length.toString(), inline: true },
						{ name: 'Total Milestones', value: result.milestones.length.toString(), inline: true },
						{ name: 'Wishlist Channel', value: wishlistChannelId === null ? 'None' : `<#${wishlistChannelId}>`, inline: true }
					)
					.setTimestamp();
				await interaction.reply({ embeds: [embed], ephemeral: true });
				return;
			}
		}
	}
});