import { formatPlural, formatPossessive, getRandomItem, quantify } from '@squiddleton/util';
import { ActionRowBuilder, BaseInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Colors, CommandInteraction, ComponentType, EmbedBuilder, Guild, Message, MessageComponentInteraction, Role, Snowflake, UserContextMenuCommandInteraction, time } from 'discord.js';
import { DiscordClient, TimestampedEmbed } from './classes';
import { ErrorMessage, RarityOrdering, Time } from './constants.js';
import { isRarity } from './typeguards.js';
import type { IGiveaway, IMessage, PaginationButtons, SlashOrMessageContextMenu, StatsEpicAccount } from './types.js';
import guildModel from '../models/guilds';
import memberModel from '../models/members';
import userModel from '../models/users';

export const areMismatchedBonusRoles = (role: Role | null, roleAmount: number | null) => (role !== null && roleAmount === null) || (role === null && roleAmount !== null);

export const createGiveawayEmbed = (giveaway: Omit<IGiveaway, 'messageId'>, guild: Guild, ended = false) => {
	const embed = new TimestampedEmbed()
		.setTitle(giveaway.text)
		.setThumbnail(guild.iconURL())
		.setColor(ended ? Colors.Red : Colors.Green)
		.setFields(
			ended
				?
				[
					{ name: 'Winners', value: giveaway.winners.length === 0 ? 'None' : giveaway.winners.map((id, i) => `${i + 1}. <@${id}> (${id})`).join('\n'), inline: true },
					{ name: 'Time', value: `Started ${time(giveaway.startTime, 'R')}\nEnded ${time(giveaway.endTime, 'R')}`, inline: true }
				]
				:
				[
					{ name: 'Winner Amount', value: giveaway.winnerNumber.toString(), inline: true },
					{ name: 'Time', value: `Ends ${time(giveaway.endTime, 'R')}`, inline: true }
				]
		);
	if (giveaway.bonusRoles.length > 0) embed.addFields({ name: 'Role Bonuses', value: giveaway.bonusRoles.map(r => `${guild.roles.cache.get(r.id)?.name ?? 'Deleted Role'}: +${r.amount} Entries`).join('\n'), inline: true });

	return embed;
};

export const createPaginationButtons = (): PaginationButtons => {
	return [
		new ButtonBuilder()
			.setCustomId('first')
			.setLabel('⏪')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true),
		new ButtonBuilder()
			.setCustomId('back')
			.setLabel('◀️')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true),
		new ButtonBuilder()
			.setCustomId('next')
			.setLabel('▶️')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('last')
			.setLabel('⏩')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('quit')
			.setLabel('Quit')
			.setStyle(ButtonStyle.Danger)
	];
};

export const fetchGiveawayMessage = async (interaction: SlashOrMessageContextMenu, channelId: Snowflake, messageId: Snowflake) => {
	if (interaction.isContextMenuCommand()) return interaction.targetMessage;
	const { client } = interaction;
	DiscordClient.assertReadyClient(client);
	const giveawayChannel = client.getVisibleChannel(channelId);
	const message = await giveawayChannel.messages.fetch(messageId);
	return message;
};

export const linkEpicAccount = async (interaction: ChatInputCommandInteraction, account: StatsEpicAccount, ephemeral = false) => {
	await userModel.findByIdAndUpdate(interaction.user.id, { epicAccountId: account.id }, { upsert: true });
	await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, ephemeral });
};

export const messageComponentCollectorFilter = (interaction: BaseInteraction) => (i: MessageComponentInteraction) => {
	if (i.user.id === interaction.user.id) return true;
	i.reply({ content: 'Only the command user can use this.', ephemeral: true });
	return false;
};

export const paginate = (interaction: CommandInteraction, message: Message, embed: EmbedBuilder, buttons: PaginationButtons, itemName: string, items: string[], inc = 25) => {
	const row = new ActionRowBuilder<ButtonBuilder>({ components: Object.values(buttons) });
	const [first, back, next, last, quit] = buttons;
	let index = 0;
	// Create the collector on the channel since message collectors do not work on ephemeral messages
	const collector = message.channel.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: (i) => i.message.id === message.id && messageComponentCollectorFilter(interaction)(i),
		time: Time.CollectorDefault
	});
	collector
		.on('collect', async i => {
			switch (i.customId) {
				case 'quit': {
					await i.update({ components: [] });
					collector.stop();
					break;
				}
				case 'first': {
					index = 0;
					await i.update({
						components: [row.setComponents([first.setDisabled(true), back.setDisabled(true), next.setDisabled(false), last.setDisabled(false), quit])],
						embeds: [embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`)]
					});
					break;
				}
				case 'back': {
					index -= inc;
					embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`);
					if (index === 0) {
						await i.update({
							components: [row.setComponents([first.setDisabled(true), back.setDisabled(true), next.setDisabled(false), last.setDisabled(false), quit])],
							embeds: [embed]
						});
					}
					else {
						await i.update({
							components: [row.setComponents([first, back, next.setDisabled(false), last.setDisabled(false), quit])],
							embeds: [embed]
						});
					}
					break;
				}
				case 'next': {
					index += inc;
					embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`);
					if (index + inc >= items.length) {
						await i.update({
							components: [row.setComponents([first.setDisabled(false), back.setDisabled(false), next.setDisabled(true), last.setDisabled(true), quit])],
							embeds: [embed]
						});
					}
					else {
						await i.update({
							components: [row.setComponents([first.setDisabled(false), back.setDisabled(false), next.setDisabled(false), last.setDisabled(false), quit])],
							embeds: [embed]
						});
					}
					break;
				}
				case 'last': {
					index = inc * Math.floor(items.length / inc);
					await i.update({
						components: [row.setComponents([first.setDisabled(false), back.setDisabled(false), next.setDisabled(true), last.setDisabled(true), quit])],
						embeds: [embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`)]
					});
				}
			}
		})
		.once('end', async (collected, reason) => {
			if (reason === 'time') {
				await interaction.editReply({ components: [] });
			}
		});
};

export const rerollGiveaway = async (interaction: SlashOrMessageContextMenu) => {
	await interaction.deferReply({ ephemeral: true });
	const messageId = interaction.isChatInputCommand() ? interaction.options.getString('message', true) : interaction.targetId;
	const amount = interaction.isChatInputCommand() ? (interaction.options.getInteger('amount') ?? 1) : 1;

	const guildResult = await guildModel.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });

	const giveaway = guildResult.giveaways.find(g => g.messageId === messageId);
	if (giveaway === undefined) {
		await interaction.editReply(`${ErrorMessage.UnknownGiveaway}.`);
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
	const newWinners: Snowflake[] = [];
	for (let i = 0; i < amount; i++) {
		const newWinner = getRandomItem(eligibleEntrants);
		winners.push(newWinner);
		newWinners.push(newWinner);
	}

	const winnersDisplay = newWinners.map((id, i) => `${newWinners.length === 1 ? '' : `${i + 1}. `}<@${id}> (${id})`).join('\n');

	const message = await fetchGiveawayMessage(interaction, giveaway.channelId, messageId);

	const newWinnersMessage = `the following new ${formatPlural('winner', amount)}:\n${winnersDisplay}`;

	await message.reply(`This giveaway has been rerolled, so congratulations to ${newWinnersMessage}`);

	await guildModel.findOneAndUpdate(
		{
			_id: interaction.guildId,
			'giveaways.messageId': messageId
		},
		{ $set: { 'giveaways.$.winners': winners } }
	);

	await interaction.editReply(`The giveaway has been rerolled with ${newWinnersMessage}`);
};

export const reviewGiveaway = async (interaction: SlashOrMessageContextMenu) => {
	if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);
	const inc = 20;
	const messageId = interaction.isChatInputCommand() ? interaction.options.getString('message', true) : interaction.targetId;
	const guildResult = await guildModel.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });
	const giveaway = guildResult.giveaways.find(g => g.messageId === messageId);

	if (giveaway === undefined) {
		await interaction.reply({ content: `${ErrorMessage.UnknownGiveaway}.`, ephemeral: true });
		return;
	}

	const giveawayMessage = await fetchGiveawayMessage(interaction, giveaway.channelId, messageId);

	const entrants = Object.entries(quantify(giveaway.entrants)).map(([name, amount], index) => `${index + 1}. <@${name}>${amount > 1 ? ` x${amount}` : ''}`);

	const embed = new TimestampedEmbed()
		.setTitle(giveawayMessage.embeds[0].title)
		.setThumbnail(interaction.guild.iconURL())
		.setColor('Blue')
		.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(0, inc).join('\n') || 'None'}`)
		.setFields([
			{ name: 'Message', value: `[Link](${giveawayMessage.url})`, inline: true },
			{ name: 'Channel', value: `<#${giveaway.channelId}>`, inline: true },
			{ name: 'Winners', value: giveaway.completed ? giveaway.winners.map((id, i) => `${i >= giveaway.winnerNumber ? '*' : ''}${i + 1}. <@${id}>${i >= giveaway.winnerNumber ? '*' : ''}`).join('\n') || 'None' : giveaway.winnerNumber.toString(), inline: true },
			{ name: 'Time', value: `${time(giveaway.startTime)} - ${time(giveaway.endTime)}> `, inline: true },
			{ name: 'Message Requirement', value: giveaway.messages === 0 ? 'None' : giveaway.messages.toString(), inline: true },
			{ name: 'Role Bonuses', value: giveaway.bonusRoles.length === 0 ? 'None' : giveaway.bonusRoles.map(r => `${interaction.guild.roles.cache.get(r.id)?.name ?? 'Deleted Role'}: ${r.amount} Entries`).join('\n'), inline: true }
		]);

	const willUseButtons = entrants.length > inc;
	const buttons = createPaginationButtons();

	const message = await interaction.reply({ components: willUseButtons ? [new ActionRowBuilder<ButtonBuilder>({ components: Object.values(buttons) })] : [], embeds: [embed], fetchReply: true, ephemeral: true });

	if (willUseButtons) paginate(interaction, message, embed, buttons, 'Entrants', entrants, inc);
};

export const sumMessages = (messages: IMessage[]) => messages.reduce((previous, current) => previous + current.messages, 0);

export const viewMilestones = async (interaction: ChatInputCommandInteraction | UserContextMenuCommandInteraction) => {
	if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);

	const { guildId } = interaction;
	const member = interaction.isChatInputCommand() ? (interaction.options.getMember('member') ?? interaction.member) : interaction.targetMember;
	const { displayName } = member;
	const user = await member.user.fetch();

	const memberResult = await memberModel.findOneAndUpdate({ userId: member.id, guildId }, {}, { new: true, upsert: true });

	const embed = new TimestampedEmbed()
		.setTitle(`${formatPossessive(displayName)} Milestones`)
		.setThumbnail(member.displayAvatarURL())
		.setColor(user.accentColor ?? null);

	if (memberResult.milestones.length === 0) {
		embed.setDescription('No milestones');
	}
	else {
		const { milestones } = await guildModel.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });

		let i = 0;
		for (const milestone of memberResult.milestones.sort((a, b) => {
			const fullA = milestones.find(m => m.name === a);
			const fullB = milestones.find(m => m.name === b);

			if (fullA === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', a));
			if (fullB === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', b));
			if (!isRarity(fullA.rarity)) {
				throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', fullA.rarity));
			}
			else if (!isRarity(fullB.rarity)) {
				throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', fullB.rarity));
			}

			return fullA.rarity === fullB.rarity ? fullA.name > fullB.name ? 1 : -1 : RarityOrdering[fullA.rarity] - RarityOrdering[fullB.rarity];
		})) {
			const milestoneWithDescription = milestones.find(m => m.name === milestone);
			if (milestoneWithDescription === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', milestone));
			if (i < 25) embed.addFields([{ name: milestone, value: milestoneWithDescription.description, inline: true }]);
			i++;
		}
	}

	await interaction.reply({ embeds: [embed], ephemeral: interaction.isContextMenuCommand() ? true : (interaction.options.getBoolean('ephemeral') ?? false) });
};