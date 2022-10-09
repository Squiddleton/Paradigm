import { ApplicationCommandOptionType, ButtonStyle, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType, PermissionFlagsBits, Message, ComponentType, ButtonInteraction, DiscordAPIError, RESTJSONErrorCodes, time } from 'discord.js';
import { randomFromArray, quantity, createGiveawayEmbed } from '../../util/functions.js';
import guildSchema from '../../schemas/guilds.js';
import { SlashCommand, validateChannel } from '@squiddleton/discordjs-util';
import { UnitChoices, UnitsToMS } from '../../constants.js';
import type { IGiveaway } from '../../types.js';

const isUnit = (unit: string): unit is keyof typeof UnitsToMS => unit in UnitsToMS;

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
					name: 'messages',
					description: 'The giveaway\'s updated minimum messages to enter',
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
					channelTypes: [ChannelType.GuildText]
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
					name: 'messages',
					description: 'Amount of monthly messages necessary for entering; defaults to 0',
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
		}
	],
	scope: 'Guild',
	permissions: PermissionFlagsBits.ManageGuild,
	async execute(interaction, client) {
		if (!interaction.inCachedGuild()) throw new Error(`The /${this.name} command should only be usable in guilds`);

		switch (interaction.options.getSubcommand()) {
			case 'edit': {
				const messageId = interaction.options.getString('message', true);
				const text = interaction.options.getString('text');
				const giveawayTime = interaction.options.getInteger('time');
				const units = interaction.options.getString('unit');
				const winners = interaction.options.getInteger('winners');
				const messages = interaction.options.getInteger('messages');
				const role1 = interaction.options.getRole('bonusrole1');
				const role2 = interaction.options.getRole('bonusrole2');
				const role1Amount = interaction.options.getInteger('bonusrole1amount');
				const role2Amount = interaction.options.getInteger('bonusrole2amount');

				if ((role1 !== null && role1Amount === null) || (role1 === null && role1Amount !== null) || (role2 !== null && role2Amount === null) || (role2 === null && role2Amount !== null)) {
					await interaction.reply({ content: 'Bonus roles must have a matching amount of bonus entries.', ephemeral: true });
					return;
				}

				const { giveaways } = await guildSchema.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });
				const giveaway = giveaways.find(g => g.messageId === messageId);
				if (giveaway === undefined) {
					await interaction.reply({ content: 'No giveaway matches that message id.', ephemeral: true });
					return;
				}
				if (giveaway.completed) {
					await interaction.reply({ content: 'That giveaway has already concluded.', ephemeral: true });
					return;
				}

				try {
					const giveawayChannel = validateChannel(client, giveaway.channelId);
					try {
						const giveawayMessage = await giveawayChannel.messages.fetch(messageId);

						if (text !== null) {
							giveaway.text = text;
						}
						if (winners !== null) {
							giveaway.winnerNumber = winners;
						}
						if (giveawayTime !== null && units !== null && isUnit(units)) {
							const endTime = giveaway.startTime + (giveawayTime * UnitsToMS[units]);
							giveaway.endTime = endTime;
						}
						else if ((giveawayTime !== null && units === null) || (giveawayTime === null && units !== null)) {
							await interaction.reply({ content: 'The updated amount of time must have matching units.', ephemeral: true });
							return;
						}
						if (messages !== null) giveaway.messages = messages;
						if (role1 !== null || role2 !== null) {
							giveaway.bonusRoles = [];
							if (role1 !== null && role1Amount !== null) giveaway.bonusRoles.push({ id: role1.id, amount: role1Amount });
							if (role2 !== null && role2Amount !== null) giveaway.bonusRoles.push({ id: role2.id, amount: role2Amount });
						}

						await guildSchema.findOneAndUpdate(
							{
								_id: interaction.guildId,
								'giveaways.messageId': messageId
							},
							{
								$set: { 'giveaways.$': giveaway }
							}
						);

						await giveawayMessage.edit({ embeds: [createGiveawayEmbed(giveaway, interaction.guild)] });
						await interaction.reply({ content: 'The giveaway has been updated.', ephemeral: true });
						return;
					}
					catch (error) {
						if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage) {
							await interaction.reply({ content: 'That giveaway message has been deleted.', ephemeral: true });
							return;
						}
					}
				}
				catch (error) {
					await interaction.reply({ content: 'This giveaway\'s channel has been deleted, or the bot cannot access it.', ephemeral: true });
				}
				break;
			}
			case 'reroll': {
				await interaction.deferReply({ ephemeral: true });
				const messageId = interaction.options.getString('message', true);
				const amount = interaction.options.getInteger('amount') ?? 1;

				const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });

				const giveaway = guildResult.giveaways.find(g => g.messageId === messageId);
				if (giveaway === undefined) {
					await interaction.editReply('I could not find a giveaway for that message id.');
					return;
				}
				if (!giveaway.completed) {
					await interaction.editReply('You cannot reroll a giveaway before it ends.');
					return;
				}

				const { winners } = giveaway;
				const eligibleEntrants = giveaway.entrants.filter(e => !giveaway.winners.includes(e));
				if (!eligibleEntrants.length) {
					await interaction.editReply('There are no more eligible entrants who can win.');
					return;
				}
				const newWinners = [];
				for (let i = 0; i < amount; i++) {
					const newWinner = randomFromArray(eligibleEntrants);
					winners.push(newWinner);
					newWinners.push(newWinner);
				}

				const winnersDisplay = newWinners.map((w, i) => `${newWinners.length === 1 ? '' : `${i + 1}. `}<@${w}> (${w})`).join('\n');
				const giveawayChannel = validateChannel(client, giveaway.channelId);
				const message = await giveawayChannel.messages.fetch(messageId);
				await message.reply(`This giveaway has been rerolled, so congratulations to the following new winner${amount !== 1 ? 's' : ''}:\n${winnersDisplay}`);

				await guildSchema.findOneAndUpdate(
					{
						_id: interaction.guildId,
						'giveaways.messageId': messageId
					},
					{ $set: { 'giveaways.$.winners': winners } }
				);

				await interaction.editReply(`The giveaway has been rerolled with the following new winner${amount !== 1 ? 's' : ''}:\n${winnersDisplay}`);
				return;
			}
			case 'review': {
				const inc = 20;
				const messageId = interaction.options.getString('message', true);
				const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });
				const giveaway = guildResult.giveaways.find(g => g.messageId === messageId);

				if (giveaway === undefined) {
					await interaction.reply({ content: 'I could not find a giveaway with that message id.', ephemeral: true });
					return;
				}

				const giveawayChannel = validateChannel(client, giveaway.channelId);
				const giveawayMessage = await giveawayChannel.messages.fetch(messageId);

				const quantities = quantity(giveaway.entrants);
				const entries = Object.entries(quantities);
				const entrants = entries.map(entry => `${entries.indexOf(entry) + 1}. <@${entry[0]}>${entry[1] > 1 ? ` x${entry[1]}` : ''}`);

				const embed = new EmbedBuilder()
					.setTitle(giveawayMessage.embeds[0].title)
					.setThumbnail(interaction.guild.iconURL())
					.setColor('Blue')
					.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(0, inc).join('\n') || 'None'}`)
					.setFields([
						{ name: 'Message', value: `[Link](${giveawayMessage.url})`, inline: true },
						{ name: 'Channel', value: `<#${giveaway.channelId}>`, inline: true },
						{ name: 'Winners', value: giveaway.completed ? giveaway.winners.map((w, i) => `${i >= giveaway.winnerNumber ? '*' : ''}${i + 1}. <@${w}>${i >= giveaway.winnerNumber ? '*' : ''}`).join('\n') || 'None' : giveaway.winnerNumber.toString(), inline: true },
						{ name: 'Time', value: `${time(giveaway.startTime)} - ${time(giveaway.endTime)}> `, inline: true },
						{ name: 'Message Requirement', value: giveaway.messages === 0 ? 'None' : giveaway.messages.toString(), inline: true },
						{ name: 'Role Bonuses', value: giveaway.bonusRoles.length === 0 ? 'None' : giveaway.bonusRoles.map(role => `${interaction.guild.roles.cache.get(role.id)?.name}: ${role.amount} Entries`).join('\n'), inline: true }
					])
					.setTimestamp();

				const willUseButtons = entrants.length > inc;
				const firstButton = new ButtonBuilder()
					.setCustomId('first')
					.setLabel('⏪')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true);
				const backButton = new ButtonBuilder()
					.setCustomId('back')
					.setLabel('◀️')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true);
				const forwardButton = new ButtonBuilder()
					.setCustomId('forward')
					.setLabel('▶️')
					.setStyle(ButtonStyle.Primary);
				const lastButton = new ButtonBuilder()
					.setCustomId('last')
					.setLabel('⏩')
					.setStyle(ButtonStyle.Primary);
				const cancelButton = new ButtonBuilder()
					.setCustomId('cancel')
					.setLabel('Cancel')
					.setStyle(ButtonStyle.Danger);
				const row = new ActionRowBuilder<ButtonBuilder>({ components: [firstButton, backButton, forwardButton, lastButton, cancelButton] });

				const msg: Message = await interaction.reply({ components: willUseButtons ? [row] : [], embeds: [embed], fetchReply: true });

				if (willUseButtons) {
					const filter = (i: ButtonInteraction) => {
						if (i.user.id === interaction.user.id) return true;
						i.reply({ content: 'Only the command user can use this.', ephemeral: true });
						return false;
					};
					const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 180000 });
					let index = 0;
					collector.on('collect', async int => {
						switch (int.customId) {
							case 'cancel': {
								await int.update({ components: [row.setComponents(row.components.map(c => c.setDisabled(true)))] });
								return collector.stop();
							}
							case 'first': {
								index = 0;
								await int.update({
									components: [row.setComponents([firstButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), lastButton.setDisabled(false), cancelButton]) ],
									embeds: [embed.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(index, index + inc).join('\n')}`)]
								});
								return;
							}
							case 'back': {
								index -= inc;
								const e = embed.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(index, index + inc).join('\n')}`);
								if (index === 0) {
									await int.update({
										components: [row.setComponents([firstButton.setDisabled(true), backButton.setDisabled(true), forwardButton.setDisabled(false), lastButton.setDisabled(false), cancelButton])],
										embeds: [e]
									});
									return;
								}
								await int.update({
									components: [row.setComponents([firstButton, backButton, forwardButton.setDisabled(false), lastButton.setDisabled(false), cancelButton])],
									embeds: [e]
								});
								return;
							}
							case 'forward': {
								index += inc;
								const e = embed.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(index, index + inc).join('\n')}`);
								if (index + inc >= entrants.length) {
									await int.update({
										components: [row.setComponents([firstButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), lastButton.setDisabled(true), cancelButton])],
										embeds: [e]
									});
									return;
								}
								await int.update({ components: [row.setComponents([firstButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(false), lastButton.setDisabled(false), cancelButton])],
									embeds: [e]
								});
								return;
							}
							case 'last': {
								index = inc * Math.floor(entrants.length / inc);
								const e = embed.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(index, index + inc).join('\n')}`);
								await int.update({
									components: [row.setComponents([firstButton.setDisabled(false), backButton.setDisabled(false), forwardButton.setDisabled(true), lastButton.setDisabled(true), cancelButton])],
									embeds: [e]
								});
								return;
							}
						}
					});

					collector.on('end', async (collected, reason) => {
						if (reason === 'time') {
							await interaction.editReply({ components: [row.setComponents(row.components.map(c => c.setDisabled(true)))] });
							return;
						}
					});
				}
				break;
			}
			case 'start': {
				const text = interaction.options.getString('text', true);
				const winners = interaction.options.getInteger('winners', true);
				const messages = interaction.options.getInteger('messages') ?? 0;
				const channel = interaction.options.getChannel('channel', true);
				if (!channel.isTextBased()) return;
				const giveawayTime = interaction.options.getInteger('time', true);
				const units = interaction.options.getString('unit', true);
				const role1 = interaction.options.getRole('bonusrole1');
				const role2 = interaction.options.getRole('bonusrole2');
				const role1Amount = interaction.options.getInteger('bonusrole1amount');
				const role2Amount = interaction.options.getInteger('bonusrole2amount');

				if ((role1 !== null && role1Amount === null) || (role1 === null && role1Amount !== null) || (role2 !== null && role2Amount === null) || (role2 === null && role2Amount !== null)) {
					await interaction.reply({ content: 'Bonus roles must have a matching amount of bonus entries.', ephemeral: true });
					return;
				}

				const startTime = Math.round(interaction.createdTimestamp / 1000);
				if (!isUnit(units)) throw new Error(`The unit "${units}" is not a valid unit`);
				const endTime = startTime + (giveawayTime * UnitsToMS[units]);

				const permissions = channel.permissionsFor(client.user);
				if (permissions === null) throw new Error(`The client user is uncached in the channel with the id "${channel.id}"`);
				if (!permissions.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
					await interaction.reply({ content: 'The View Channel, Send Messages, and Embed Links permissions in the selected channel are required to use this command.', ephemeral: true });
					return;
				}

				const bonusRoles = [];
				if (role1 !== null && role1Amount !== null) bonusRoles.push({ id: role1.id, amount: role1Amount });
				if (role2 !== null && role2Amount !== null) bonusRoles.push({ id: role2.id, amount: role2Amount });

				const withoutMessage: Omit<IGiveaway, 'messageId'> = {
					channelId: channel.id,
					text,
					startTime,
					endTime,
					completed: false,
					messages,
					bonusRoles,
					winnerNumber: winners,
					entrants: [],
					winners: []
				};

				const row = new ActionRowBuilder<ButtonBuilder>({ components: [
					new ButtonBuilder()
						.setLabel('Enter')
						.setCustomId('giveaway')
						.setStyle(ButtonStyle.Success)
				] });
				const embed = createGiveawayEmbed(withoutMessage, interaction.guild);
				const message = await channel.send({ components: [row], embeds: [embed] });

				const giveaway: IGiveaway = {
					messageId: message.id,
					...withoutMessage
				};

				await guildSchema.findByIdAndUpdate(
					interaction.guildId,
					{ $push: { giveaways: giveaway } },
					{ upsert: true }
				);

				await interaction.reply({ content: 'Succesfully hosted the giveaway!', ephemeral: true });
				return;
			}
		}
	}
});