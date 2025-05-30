import { SlashCommand } from '@squiddleton/discordjs-util';
import { ActionRowBuilder, ApplicationCommandOptionType, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, DiscordAPIError, MessageFlags, PermissionFlagsBits, PermissionsBitField, RESTJSONErrorCodes } from 'discord.js';
import guildModel from '../../models/guilds.js';
import { DiscordClient } from '../../util/classes.js';
import { AccessibleChannelPermissions, ErrorMessage, TextBasedChannelTypes, UnitChoices, UnitsToMS } from '../../util/constants.js';
import { areMismatchedBonusRoles, createGiveawayEmbed, isKey, rerollGiveaway, reviewGiveaway } from '../../util/functions.js';
import type { IBonusRole, IGiveaway } from '../../util/types.js';

export default new SlashCommand({
	name: 'giveaway',
	description: 'Various methods with giveaways',
	options: [
		{
			name: 'edit',
			description: 'Edit an ongoing giveaway',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'message',
					description: 'The message id of the giveaway to edit',
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: 'text',
					description: 'The giveaway\'s updated text',
					type: ApplicationCommandOptionType.String
				},
				{
					name: 'time',
					description: 'The updated amount of time to host the giveaway',
					type: ApplicationCommandOptionType.Integer
				},
				{
					name: 'unit',
					description: 'The updated unit of time to host the giveaway',
					type: ApplicationCommandOptionType.String,
					choices: UnitChoices
				},
				{
					name: 'winners',
					description: 'The giveaway\'s updated winner amount',
					type: ApplicationCommandOptionType.Integer,
					minValue: 0
				},
				{
					name: 'bonusrole1',
					description: 'Role that receives extra entries',
					type: ApplicationCommandOptionType.Role
				},
				{
					name: 'bonusrole1amount',
					description: 'Amount of extra entries for members with bonusrole1',
					type: ApplicationCommandOptionType.Integer,
					minValue: 1,
					maxValue: 10
				},
				{
					name: 'bonusrole2',
					description: 'Role that receives extra entries',
					type: ApplicationCommandOptionType.Role
				},
				{
					name: 'bonusrole2amount',
					description: 'Amount of extra entries for members with bonusrole2',
					type: ApplicationCommandOptionType.Integer,
					minValue: 1,
					maxValue: 10
				}
			]
		},
		{
			name: 'reroll',
			description: 'Reroll a concluded giveaway to have a new winner',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'message',
					description: 'The message id of the giveaway to reroll',
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: 'amount',
					description: 'The amount of new winners to reroll (defualts to 1)',
					type: ApplicationCommandOptionType.Integer
				}
			]
		},
		{
			name: 'review',
			description: 'Review an ongoing or past giveaway',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'message',
					description: 'The message id of the giveaway to review',
					type: ApplicationCommandOptionType.String,
					required: true
				}
			]
		},
		{
			name: 'start',
			description: 'Start a giveaway',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'text',
					description: 'Text to display during the giveaway',
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: 'channel',
					description: 'Channel to host the giveaway in',
					type: ApplicationCommandOptionType.Channel,
					required: true,
					channelTypes: TextBasedChannelTypes
				},
				{
					name: 'time',
					description: 'Amount of time to host the giveaway',
					type: ApplicationCommandOptionType.Integer,
					required: true
				},
				{
					name: 'unit',
					description: 'Unit of time to host the giveaway',
					type: ApplicationCommandOptionType.String,
					required: true,
					choices: UnitChoices
				},
				{
					name: 'winners',
					description: 'Amount of winners for the giveaway',
					type: ApplicationCommandOptionType.Integer,
					required: true,
					minValue: 0
				},
				{
					name: 'bonusrole1',
					description: 'Role that receives extra entries',
					type: ApplicationCommandOptionType.Role
				},
				{
					name: 'bonusrole1amount',
					description: 'Amount of extra entries for members with bonusrole1',
					type: ApplicationCommandOptionType.Integer,
					minValue: 1,
					maxValue: 10
				},
				{
					name: 'bonusrole2',
					description: 'Role that receives extra entries',
					type: ApplicationCommandOptionType.Role
				},
				{
					name: 'bonusrole2amount',
					description: 'Amount of extra entries for members with bonusrole2',
					type: ApplicationCommandOptionType.Integer,
					minValue: 1,
					maxValue: 10
				}
			]
		}
	],
	scope: 'Guild',
	permissions: PermissionFlagsBits.ManageGuild,
	integrationTypes: [ApplicationIntegrationType.GuildInstall],
	async execute(interaction, client) {
		DiscordClient.assertReadyClient(client);
		if (!interaction.inCachedGuild()) {
			await interaction.reply({ content: 'This command can only be used if the bot has been added to the server. Please contact a server moderator to add the bot as a member.' });
			throw new Error(ErrorMessage.OutOfCachedGuild);
		}

		switch (interaction.options.getSubcommand()) {
			case 'edit': {
				const messageId = interaction.options.getString('message', true);
				const text = interaction.options.getString('text');
				const giveawayTime = interaction.options.getInteger('time');
				const units = interaction.options.getString('unit');
				const winners = interaction.options.getInteger('winners');
				const role1 = interaction.options.getRole('bonusrole1');
				const role2 = interaction.options.getRole('bonusrole2');
				const role1Amount = interaction.options.getInteger('bonusrole1amount');
				const role2Amount = interaction.options.getInteger('bonusrole2amount');

				if (areMismatchedBonusRoles(role1, role1Amount) || areMismatchedBonusRoles(role2, role2Amount)) {
					await interaction.reply({ content: 'Bonus roles must have a matching amount of bonus entries.', flags: MessageFlags.Ephemeral });
					return;
				}

				const { giveaways } = await guildModel.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });
				const giveaway = giveaways.find(g => g.messageId === messageId);
				if (giveaway === undefined) {
					await interaction.reply({ content: `${ErrorMessage.UnknownGiveaway}.`, flags: MessageFlags.Ephemeral });
					return;
				}
				if (giveaway.completed) {
					await interaction.reply({ content: 'That giveaway has already concluded.', flags: MessageFlags.Ephemeral });
					return;
				}

				try {
					const giveawayChannel = client.getVisibleChannel(giveaway.channelId);
					try {
						const giveawayMessage = await giveawayChannel.messages.fetch(messageId);

						if (text !== null) {
							giveaway.text = text;
						}
						if (winners !== null) {
							giveaway.winnerNumber = winners;
						}
						if (giveawayTime !== null && units !== null && isKey(units, UnitsToMS)) {
							const endTime = giveaway.startTime + (giveawayTime * UnitsToMS[units]);
							giveaway.endTime = endTime;
						}
						else if ((giveawayTime !== null && units === null) || (giveawayTime === null && units !== null)) {
							await interaction.reply({ content: 'The updated amount of time must have matching units.', flags: MessageFlags.Ephemeral });
							return;
						}
						if (role1 !== null || role2 !== null) {
							giveaway.bonusRoles = [];
							if (role1 !== null && role1Amount !== null) giveaway.bonusRoles.push({ id: role1.id, amount: role1Amount });
							if (role2 !== null && role2Amount !== null) giveaway.bonusRoles.push({ id: role2.id, amount: role2Amount });
						}

						await guildModel.findOneAndUpdate(
							{
								'_id': interaction.guildId,
								'giveaways.messageId': messageId
							},
							{
								$set: { 'giveaways.$': giveaway }
							}
						);

						await giveawayMessage.edit({ embeds: [createGiveawayEmbed(giveaway, interaction.guild)] });
						await interaction.reply({ content: 'The giveaway has been updated.', flags: MessageFlags.Ephemeral });
					}
					catch (error) {
						const errorCodes: (string | number)[] = [RESTJSONErrorCodes.InvalidWebhookToken, RESTJSONErrorCodes.UnknownMessage];
						if (!(error instanceof DiscordAPIError) || !errorCodes.includes(error.code)) throw error;

						await interaction.reply({ content: 'That giveaway message has been deleted.', flags: MessageFlags.Ephemeral });
					}
				}
				catch (error) {
					if (error instanceof Error)
						await interaction.reply({ content: 'This giveaway\'s channel has been deleted, or the bot cannot access it.', flags: MessageFlags.Ephemeral });
					else
						throw error;
				}
				break;
			}
			case 'reroll': {
				await rerollGiveaway(interaction);
				break;
			}
			case 'review': {
				await reviewGiveaway(interaction);
				break;
			}
			case 'start': {
				const text = interaction.options.getString('text', true);
				const winners = interaction.options.getInteger('winners', true);
				const channel = interaction.options.getChannel('channel', true, TextBasedChannelTypes);
				const giveawayTime = interaction.options.getInteger('time', true);
				const units = interaction.options.getString('unit', true);
				const role1 = interaction.options.getRole('bonusrole1');
				const role2 = interaction.options.getRole('bonusrole2');
				const role1Amount = interaction.options.getInteger('bonusrole1amount');
				const role2Amount = interaction.options.getInteger('bonusrole2amount');

				if (areMismatchedBonusRoles(role1, role1Amount) || areMismatchedBonusRoles(role2, role2Amount)) {
					await interaction.reply({ content: 'Bonus roles must have a matching amount of bonus entries.', flags: MessageFlags.Ephemeral });
					return;
				}

				const startTime = Math.round(interaction.createdTimestamp / 1000);
				if (!isKey(units, UnitsToMS)) throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', units));
				const endTime = startTime + (giveawayTime * UnitsToMS[units]);

				const permissions = client.getPermissions(channel);
				if (!permissions.has([...AccessibleChannelPermissions, PermissionsBitField.Flags.EmbedLinks])) {
					await interaction.reply({ content: 'The View Channel, Send Messages, and Embed Links permissions in the selected channel are required to use this command.', flags: MessageFlags.Ephemeral });
					return;
				}

				const bonusRoles: IBonusRole[] = [];
				if (role1 !== null && role1Amount !== null) bonusRoles.push({ id: role1.id, amount: role1Amount });
				if (role2 !== null && role2Amount !== null) bonusRoles.push({ id: role2.id, amount: role2Amount });

				const withoutMessage: Omit<IGiveaway, 'messageId'> = {
					channelId: channel.id,
					text,
					startTime,
					endTime,
					completed: false,
					bonusRoles,
					winnerNumber: winners,
					entrants: [],
					winners: []
				};

				const row = new ActionRowBuilder<ButtonBuilder>({
					components: [
						new ButtonBuilder()
							.setLabel('Enter')
							.setCustomId('giveaway')
							.setStyle(ButtonStyle.Primary)
					]
				});
				const message = await channel.send({ components: [row], embeds: [createGiveawayEmbed(withoutMessage, interaction.guild)] });

				const giveaway: IGiveaway = {
					messageId: message.id,
					...withoutMessage
				};

				await guildModel.findByIdAndUpdate(
					interaction.guildId,
					{ $push: { giveaways: giveaway } },
					{ upsert: true }
				);

				await interaction.reply({ content: 'Succesfully hosted the giveaway!', flags: MessageFlags.Ephemeral });
			}
		}
	}
});