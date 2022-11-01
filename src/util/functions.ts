import { validateChannel } from '@squiddleton/discordjs-util';
import { ActionRowBuilder, BaseInteraction, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Client, Colors, CommandInteraction, ComponentType, EmbedBuilder, Guild, Message, MessageComponentInteraction, PermissionFlagsBits, Role, Snowflake, UserContextMenuCommandInteraction, time } from 'discord.js';
import guildSchema from '../schemas/guilds';
import memberSchema from '../schemas/members';
import userSchema from '../schemas/users';
import { TimestampedEmbed } from './classes';
import { AccessibleChannelPermissions, DefaultCollectorTime, ErrorMessage, RarityOrdering } from './constants.js';
import { isRarity } from './typeguards.js';
import type { AnyGuildTextChannel, IGiveaway, IMessage, PaginationButtons, Quantity, SlashOrMessageContextMenu, StatsEpicAccount } from './types.js';

export const areMismatchedBonusRoles = (role: Role | null, roleAmount: number | null) => (role !== null && roleAmount === null) || (role === null && roleAmount !== null);

export const createGiveawayEmbed = (giveaway: IGiveaway | Omit<IGiveaway, 'messageId'>, guild: Guild, ended = false) => {
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
	if (giveaway.bonusRoles.length > 0) embed.addFields({ name: 'Role Bonuses', value: giveaway.bonusRoles.map(role => `${guild.roles.cache.get(role.id)?.name}: +${role.amount} Entries`).join('\n'), inline: true });

	return embed;
};

export const createPaginationButtons = (): PaginationButtons => {
	return {
		first: new ButtonBuilder()
			.setCustomId('first')
			.setLabel('⏪')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true),
		back: new ButtonBuilder()
			.setCustomId('back')
			.setLabel('◀️')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true),
		next: new ButtonBuilder()
			.setCustomId('next')
			.setLabel('▶️')
			.setStyle(ButtonStyle.Primary),
		last: new ButtonBuilder()
			.setCustomId('last')
			.setLabel('⏩')
			.setStyle(ButtonStyle.Primary),
		quit: new ButtonBuilder()
			.setCustomId('quit')
			.setLabel('Quit')
			.setStyle(ButtonStyle.Danger)
	};
};

export const formatPlural = (singularStr: string, amount: number) => `${singularStr}${amount === 1 ? '' : 's'}`;

export const formatPossessive = (str: string) => `${str}'${['s', 'z'].some(c => str.endsWith(c)) ? '' : 's'}`;

export const getClientPermissions = (client: Client<true>, channel: AnyGuildTextChannel) => {
	const permissions = channel.permissionsFor(client.user);
	if (permissions === null) throw new Error(ErrorMessage.UncachedClient);
	return permissions;
};

export const getEnumKeys = (e: Record<string, any>) => Object.keys(e).filter(x => !(parseInt(x) >= 0));

export const linkEpicAccount = async (interaction: ChatInputCommandInteraction, account: StatsEpicAccount) => {
	await userSchema.findByIdAndUpdate(interaction.user.id, { epicAccountId: account.id }, { upsert: true });
	await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, ephemeral: true });
};

export const messageComponentCollectorFilter = (interaction: BaseInteraction) => (i: MessageComponentInteraction) => {
	if (i.user.id === interaction.user.id) return true;
	i.reply({ content: 'Only the command user can use this.', ephemeral: true });
	return false;
};

export const noPunc = (str: string) => str
	.toLowerCase()
	.normalize('NFD')
	.replace(/\p{Diacritic}/gu, '')
	.replaceAll('&', 'and')
	.replace(/[^0-9a-z]/gi, '');

export const paginate = (interaction: CommandInteraction, message: Message, embed: EmbedBuilder, buttons: PaginationButtons, itemName: string, items: string[], inc = 25) => {
	const row = new ActionRowBuilder<ButtonBuilder>({ components: Object.values(buttons) });
	const { first, back, next, last, quit } = buttons;
	let index = 0;
	const collector = message.channel.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: (i) => i.message.id === message.id && messageComponentCollectorFilter(interaction)(i),
		time: DefaultCollectorTime
	});
	collector.on('collect', async int => {
		switch (int.customId) {
			case 'quit': {
				await int.update({ components: [row.setComponents(row.components.map(c => c.setDisabled(true)))] });
				return collector.stop();
			}
			case 'first': {
				index = 0;
				await int.update({
					components: [row.setComponents([first.setDisabled(true), back.setDisabled(true), next.setDisabled(false), last.setDisabled(false), quit]) ],
					embeds: [embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`)]
				});
				return;
			}
			case 'back': {
				index -= inc;
				embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`);
				if (index === 0) {
					await int.update({
						components: [row.setComponents([first.setDisabled(true), back.setDisabled(true), next.setDisabled(false), last.setDisabled(false), quit])],
						embeds: [embed]
					});
					return;
				}
				await int.update({
					components: [row.setComponents([first, back, next.setDisabled(false), last.setDisabled(false), quit])],
					embeds: [embed]
				});
				return;
			}
			case 'next': {
				index += inc;
				embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`);
				if (index + inc >= items.length) {
					await int.update({
						components: [row.setComponents([first.setDisabled(false), back.setDisabled(false), next.setDisabled(true), last.setDisabled(true), quit])],
						embeds: [embed]
					});
					return;
				}
				await int.update({ components: [row.setComponents([first.setDisabled(false), back.setDisabled(false), next.setDisabled(false), last.setDisabled(false), quit])],
					embeds: [embed]
				});
				return;
			}
			case 'last': {
				index = inc * Math.floor(items.length / inc);
				embed.setDescription(`${itemName} (${items.length}):\n${items.slice(index, index + inc).join('\n')}`);
				await int.update({
					components: [row.setComponents([first.setDisabled(false), back.setDisabled(false), next.setDisabled(true), last.setDisabled(true), quit])],
					embeds: [embed]
				});
			}
		}
	});

	collector.on('end', async (collected, reason) => {
		if (reason === 'time') {
			await interaction.editReply({ components: [row.setComponents(row.components.map(c => c.setDisabled(true)))] });
		}
	});
};

/**
 *
 * @param arr - An array to receive a quantity of each item for
 * @returns An object with keys of each item and values of the item's quantity
 */
export const quantity = (arr: string[]) => {
	const counts: Quantity = {};
	for (const item of arr) {
		if (item in counts) {
			counts[item]++;
		}
		else {
			counts[item] = 1;
		}
	}
	return counts;
};

export const randomFromArray = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const removeDuplicates = <T>(arr: T[]) => Array.from(new Set(arr));

export const sum = (previous: number, current: number) => previous + current;

export const sumMsgs = (previous: number, current: IMessage) => previous + current.messages;

export const validateGuildChannel = (client: Client<true>, channelId: Snowflake, checkPermissions = true): AnyGuildTextChannel => {
	const channel = validateChannel(client, channelId);
	if (channel.type === ChannelType.DM) throw new Error(`The channel "${channelId}" is actually the DM channel for recipient "${channel.recipientId}"`);

	if (checkPermissions) {
		const permissions = getClientPermissions(client, channel);
		if (!permissions.has(AccessibleChannelPermissions)) throw new Error(ErrorMessage.MissingPermissions.replace('{channelId}', channelId));
	}
	return channel;
};

export const validateVisibleChannel = (client: Client<true>, channelId: Snowflake) => {
	const channel = validateGuildChannel(client, channelId, false);
	const permissions = getClientPermissions(client, channel);
	if (!permissions.has(PermissionFlagsBits.ViewChannel)) throw new Error(ErrorMessage.InvisibleChannel.replace('{channelId}', channelId));
	return channel;
};

export const fetchGiveawayMessage = async (interaction: SlashOrMessageContextMenu, channelId: Snowflake, messageId: Snowflake) => {
	if (interaction.isContextMenuCommand()) return interaction.targetMessage;

	const giveawayChannel = validateVisibleChannel(interaction.client, channelId);
	const message = await giveawayChannel.messages.fetch(messageId);
	return message;
};

export const rerollGiveaway = async (interaction: SlashOrMessageContextMenu) => {
	await interaction.deferReply({ ephemeral: true });
	const messageId = interaction.isChatInputCommand() ? interaction.options.getString('message', true) : interaction.targetId;
	const amount = interaction.isChatInputCommand() ? (interaction.options.getInteger('amount') ?? 1) : 1;

	const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });

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
		const newWinner = randomFromArray(eligibleEntrants);
		winners.push(newWinner);
		newWinners.push(newWinner);
	}

	const winnersDisplay = newWinners.map((w, i) => `${newWinners.length === 1 ? '' : `${i + 1}. `}<@${w}> (${w})`).join('\n');

	const message = await fetchGiveawayMessage(interaction, giveaway.channelId, messageId);

	const newWinnersMessage = `the following new ${formatPlural('winner', amount)}:\n${winnersDisplay}`;

	await message.reply(`This giveaway has been rerolled, so congratulations to ${newWinnersMessage}`);

	await guildSchema.findOneAndUpdate(
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
	const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });
	const giveaway = guildResult.giveaways.find(g => g.messageId === messageId);

	if (giveaway === undefined) {
		await interaction.reply({ content: `${ErrorMessage.UnknownGiveaway}.`, ephemeral: true });
		return;
	}

	const message = await fetchGiveawayMessage(interaction, giveaway.channelId, messageId);

	const entrants = Object.entries(quantity(giveaway.entrants)).map(([name, amount], index) => `${index + 1}. <@${name}>${amount > 1 ? ` x${amount}` : ''}`);

	const embed = new TimestampedEmbed()
		.setTitle(message.embeds[0].title)
		.setThumbnail(interaction.guild.iconURL())
		.setColor('Blue')
		.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(0, inc).join('\n') || 'None'}`)
		.setFields([
			{ name: 'Message', value: `[Link](${message.url})`, inline: true },
			{ name: 'Channel', value: `<#${giveaway.channelId}>`, inline: true },
			{ name: 'Winners', value: giveaway.completed ? giveaway.winners.map((w, i) => `${i >= giveaway.winnerNumber ? '*' : ''}${i + 1}. <@${w}>${i >= giveaway.winnerNumber ? '*' : ''}`).join('\n') || 'None' : giveaway.winnerNumber.toString(), inline: true },
			{ name: 'Time', value: `${time(giveaway.startTime)} - ${time(giveaway.endTime)}> `, inline: true },
			{ name: 'Message Requirement', value: giveaway.messages === 0 ? 'None' : giveaway.messages.toString(), inline: true },
			{ name: 'Role Bonuses', value: giveaway.bonusRoles.length === 0 ? 'None' : giveaway.bonusRoles.map(role => `${interaction.guild.roles.cache.get(role.id)?.name}: ${role.amount} Entries`).join('\n'), inline: true }
		]);

	const willUseButtons = entrants.length > inc;
	const buttons = createPaginationButtons();
	const row = new ActionRowBuilder<ButtonBuilder>({ components: Object.values(buttons) });

	const msg = await interaction.reply({ components: willUseButtons ? [row] : [], embeds: [embed], fetchReply: true, ephemeral: true });

	if (willUseButtons) paginate(interaction, msg, embed, buttons, 'Entrants', entrants, inc);
};

export const viewMilestones = async (interaction: ChatInputCommandInteraction | UserContextMenuCommandInteraction) => {
	if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);

	const { guildId } = interaction;
	const member = interaction.isChatInputCommand() ? (interaction.options.getMember('member') ?? interaction.member) : interaction.targetMember;
	const { displayName } = member;
	const user = await member.user.fetch();

	const memberResult = await memberSchema.findOneAndUpdate({ userId: member.id, guildId }, {}, { new: true, upsert: true });

	const embed = new TimestampedEmbed()
		.setTitle(`${formatPossessive(displayName)} Milestones`)
		.setThumbnail(member.displayAvatarURL())
		.setColor(user.accentColor ?? null);

	if (memberResult.milestones.length === 0) {
		embed.setDescription('No milestones');
	}
	else {
		const { milestones } = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });

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