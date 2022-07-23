import { ApplicationCommandOptionType, ButtonStyle, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChannelType, PermissionFlagsBits, Message, ComponentType, ButtonInteraction } from 'discord.js';
import { randomFromArray, quantity, validateChannel } from '../../util/functions.js';
import guildSchema, { IGiveaway } from '../../schemas/guilds.js';
import { Scope, SlashCommand } from '../../types/types.js';

const factors = {
	minutes: 60,
	hours: 3600,
	days: 86400
};
const isUnit = (unit: string): unit is keyof typeof factors => unit in factors;

export default new SlashCommand({
	name: 'giveaway',
	description: 'Various methods with giveaways',
	options: [
		{
			name: 'edit',
			description: 'Edit a pre-existing giveaway',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'message',
					description: 'The message id of the giveaway to review',
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
					description: 'Amount of time to host the giveaway',
					type: ApplicationCommandOptionType.Integer
				},
				{
					name: 'unit',
					description: 'Unit of time to host the giveaway',
					type: ApplicationCommandOptionType.String,
					choices: [
						{ name: 'Minutes', value: 'minutes' },
						{ name: 'Hours', value: 'hours' },
						{ name: 'Days', value: 'days' }
					]
				},
				{
					name: 'winners',
					description: 'The giveaway\'s updated winner amount',
					type: ApplicationCommandOptionType.Integer,
					minValue: 0
				},
				{
					name: 'messages',
					description: 'The giveaway\'s updated minimum messages to enter (over the past month)',
					type: ApplicationCommandOptionType.Integer,
					minValue: 0
				},
				{
					name: 'regular',
					description: 'The giveaway\'s updated extra entries for Regulars',
					type: ApplicationCommandOptionType.Integer,
					minValue: 0,
					maxValue: 10
				},
				{
					name: 'booster',
					description: 'The giveaway\'s updated extra entries for Nitro Boosters',
					type: ApplicationCommandOptionType.Integer,
					minValue: 0,
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
					choices: [
						{ name: 'Minutes', value: 'minutes' },
						{ name: 'Hours', value: 'hours' },
						{ name: 'Days', value: 'days' }
					]
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
					description: 'Amount of messages necessary for entering',
					type: ApplicationCommandOptionType.Integer,
					required: true,
					minValue: 0
				},
				{
					name: 'regular',
					description: 'Amount of extra entries for users with the Regular role',
					type: ApplicationCommandOptionType.Integer,
					minValue: 0,
					maxValue: 10
				},
				{
					name: 'booster',
					description: 'Amount of extra entries for users with the Nitro Booster role',
					type: ApplicationCommandOptionType.Integer,
					minValue: 0,
					maxValue: 10
				}
			]
		}
	],
	scope: Scope.Guild,
	permissions: [PermissionFlagsBits.ManageGuild],
	async execute(interaction, client) {
		if (!interaction.inCachedGuild()) throw new Error(`The /${this.name} command should only be usable in guilds`);

		switch (interaction.options.getSubcommand()) {
			case 'edit': {
				const messageId = interaction.options.getString('message', true);
				const text = interaction.options.getString('text');
				const time = interaction.options.getInteger('time');
				const units = interaction.options.getString('unit');
				const winners = interaction.options.getInteger('winners');
				const messages = interaction.options.getInteger('messages');
				const regEntries = interaction.options.getInteger('regular');
				const boosterEntries = interaction.options.getInteger('booster');

				const { giveaways } = await guildSchema.findByIdAndUpdate(interaction.guildId, {
					$setOnInsert: {
						giveaways: [],
						milestones: []
					}
				}, { new: true, upsert: true });
				const giveaway = giveaways.find(g => g.messageId === messageId);
				if (giveaway === undefined) {
					await interaction.reply({ content: 'No giveaway matches that message id.', ephemeral: true });
					return;
				}
				if (giveaway.completed) {
					await interaction.reply({ content: 'That giveaway has already concluded.', ephemeral: true });
					return;
				}

				const giveawayChannel = validateChannel(client, giveaway.channelId, 'Giveaway channel');
				const giveawayMessage = await giveawayChannel.messages.fetch(messageId);
				const embed = EmbedBuilder.from(giveawayMessage.embeds[0]);
				if (embed.data.fields === undefined) throw new Error(`A giveaway embed from the message id "${messageId}" is missing its "fields" property`);

				if (text !== null) embed.setTitle(text);
				if (time && units) {
					if (isUnit(units)) {
						const endTime = giveaway.startTime + (time * factors[units]);
						giveaway.endTime = endTime;
						embed.data.fields[1].value = `Ends <t:${endTime}:R>`;
					}
				}
				if (winners) {
					giveaway.winnerNumber = winners;
					embed.data.fields[0].value = winners.toString();
				}
				if (messages) giveaway.messages = messages;
				if (regEntries) giveaway.regEntries = regEntries;
				if (boosterEntries) giveaway.boosterEntries = boosterEntries;
				await guildSchema.findOneAndUpdate(
					{
						_id: interaction.guildId,
						'giveaways.messageId': messageId
					},
					{
						$set: { 'giveaways.$': giveaway }
					}
				);
				await giveawayMessage.edit({ embeds: [embed] });
				await interaction.reply('The giveaway has been updated.');
				return;
			}
			case 'reroll': {
				await interaction.deferReply({ ephemeral: true });
				const messageId = interaction.options.getString('message', true);
				const amount = interaction.options.getInteger('amount') ?? 1;

				const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {
					$setOnInsert: {
						giveaways: [],
						milestones: []
					}
				}, { new: true, upsert: true });

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
				const giveawayChannel = validateChannel(client, giveaway.channelId, 'Giveaway channel');
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
				const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {
					$setOnInsert: {
						giveaways: [],
						milestones: []
					}
				}, { new: true, upsert: true });
				const giveaway = guildResult.giveaways.find(g => g.messageId === messageId);

				if (giveaway === undefined) {
					await interaction.reply({ content: 'I could not find a giveaway with that message id.', ephemeral: true });
					return;
				}

				const giveawayChannel = validateChannel(client, giveaway.channelId, 'Giveaway channel');
				const giveawayMessage = await giveawayChannel.messages.fetch(messageId);

				const quantities = quantity(giveaway.entrants);
				const entries = Object.entries(quantities);
				const entrants = entries.map(entry => `${entries.indexOf(entry) + 1}. <@${entry[0]}>${entry[1] > 1 ? ` x${entry[1]}` : ''}`);

				const embed = new EmbedBuilder()
					.setTitle(giveawayMessage.embeds[0].title)
					.setThumbnail(interaction.guild.iconURL())
					.setColor('Blue')
					.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(0, inc).join('\n') || 'None'}`)
					.setTimestamp();

				embed.setFields([
					{ name: 'Winners', value: giveaway.completed ? giveaway.winners.map((w, i) => `${i >= giveaway.winnerNumber ? '*' : ''}${i + 1}. <@${w}>${i >= giveaway.winnerNumber ? '*' : ''}`).join('\n') || 'None' : giveaway.winnerNumber.toString(), inline: true },
					{ name: 'Message Requirement', value: giveaway.messages.toString(), inline: true },
					{ name: 'Bonus Entries', value: `Regular: ${giveaway.regEntries ?? 0}\nNitro Booster: ${giveaway.boosterEntries ?? 0}`, inline: true },
					{ name: 'Time', value: `<t:${giveaway.startTime}> - <t:${giveaway.endTime}> `, inline: true },
					{ name: 'Message', value: `[Link](${giveawayMessage.url})`, inline: true },
					{ name: 'Channel', value: `<#${giveaway.channelId}>`, inline: true }
				]);

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
				const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder({ components: [firstButton, backButton, forwardButton, lastButton, cancelButton] });

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
				const messages = interaction.options.getInteger('messages', true);
				const channel = interaction.options.getChannel('channel', true);
				if (!channel.isTextBased()) return;
				const time = interaction.options.getInteger('time', true);
				const units = interaction.options.getString('unit', true);
				const regEntries = interaction.options.getInteger('regular');
				const boosterEntries = interaction.options.getInteger('booster');

				const startTime = Math.round(interaction.createdTimestamp / 1000);
				if (!isUnit(units)) throw new Error(`The unit "${units}" is not a valid unit`);
				const endTime = startTime + (time * factors[units]);

				const permissions = channel.permissionsFor(client.user);
				if (permissions === null) throw new Error(`The client user is uncached in the channel with the id "${channel.id}"`);
				if (!permissions.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
					await interaction.reply({ content: 'The View Channel, Send Messages, and Embed Links permissions in the selected channel are required to use this command.', ephemeral: true });
					return;
				}

				const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder({ components: [
					new ButtonBuilder()
						.setLabel('Enter')
						.setCustomId('fnbrgiveaway')
						.setStyle(ButtonStyle.Success)
				] });
				const embed = new EmbedBuilder()
					.setTitle(text)
					.setThumbnail(interaction.guild.iconURL())
					.setColor('Green')
					.setFields([
						{ name: 'Winner Amount', value: winners.toString(), inline: true },
						{ name: 'Time', value: `Ends <t:${endTime}:R>`, inline: true }
					])
					.setTimestamp();

				if (regEntries) {
					if (boosterEntries) embed.setDescription(`**The following roles receive bonus entries:**\nNitro Booster (+${boosterEntries})\nRegular (+${regEntries})`);
					else embed.setDescription(`**The following roles receive bonus entries:**\nRegular (+${regEntries})`);
				}
				else if (boosterEntries) {
					embed.setDescription(`**The following roles receive bonus entries:**\nNitro Booster (+${boosterEntries})`);
				}

				const message = await channel.send({ components: [row], embeds: [embed] });

				const giveaway: IGiveaway = {
					messageId: message.id,
					channelId: channel.id,
					startTime,
					endTime,
					completed: false,
					messages,
					regEntries: regEntries ?? 0,
					boosterEntries: boosterEntries ?? 0,
					winnerNumber: winners,
					entrants: [],
					winners: []
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