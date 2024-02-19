import { formatPlural, formatPossessive, getRandomItem, quantify } from '@squiddleton/util';
import { ActionRowBuilder, type BaseInteraction, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, Colors, type CommandInteraction, ComponentType, DiscordAPIError, EmbedBuilder, type Guild, type Message, type MessageComponentInteraction, RESTJSONErrorCodes, type Role, type Snowflake, type UserContextMenuCommandInteraction, channelMention, hyperlink, time, underscore, userMention } from 'discord.js';
import { DiscordClient } from './classes.js';
import { ErrorMessage, RarityOrdering, Time } from './constants.js';
import type { IGiveaway, PaginationButtons, SlashOrMessageContextMenu } from './types.js';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';

/**
 * Checks if a role with bonus giveaways entries has a matching amount of bonus entries provided, and if the entry amount has a matching role.
 *
 * @param role - The role that will receive bonus entries
 * @param roleAmount - The amount of bonus entries that the role will receive
 * @returns A boolean of whether only the role or only the role amount were provided
 */
export const areMismatchedBonusRoles = (role: Role | null, roleAmount: number | null) => (role !== null && roleAmount === null) || (role === null && roleAmount !== null);

/**
 * Returns an embed used for giveaways.
 *
 * @param giveaway - The giveaway database document that may be missing its messageId
 * @param guild - The guild containing the giveaway
 * @param ended - Whether the embed is created after the giveaway has concluded
 * @returns An embed displaying the current status and features of the giveaway
 */
export const createGiveawayEmbed = (giveaway: Omit<IGiveaway, 'messageId'>, guild: Guild, ended = false) => {
	const embed = new EmbedBuilder()
		.setTitle(giveaway.text)
		.setThumbnail(guild.iconURL())
		.setColor(ended ? Colors.Red : Colors.Green)
		.setFields(
			ended
				?
				[
					{ name: 'Winners', value: giveaway.winners.length === 0 ? 'None' : giveaway.winners.map((id, i) => `${i + 1}. ${userMention(id)} (${id})`).join('\n'), inline: true },
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

export const createGuildEmbed = (guild: Guild, created: boolean) => new EmbedBuilder()
	.setTitle(guild.name)
	.setImage(guild.iconURL())
	.setFields(
		{ name: 'Owner ID', value: guild.ownerId },
		{ name: 'Member Count', value: guild.memberCount.toString() }
	)
	.setColor(created ? Colors.Green : Colors.Red)
	.setFooter({ text: guild.id });

/**
 * Returns an array of buttons used for paginated lists.
 *
 * @returns An array of buttons
 */
export const createPaginationButtons = (): PaginationButtons => [
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
		.setLabel('Cancel')
		.setStyle(ButtonStyle.Secondary)
];

/**
 * Fetches the message linked to a specific giveaway.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param channelId - The id of the channel containing the giveaway message
 * @param messageId - The id of the giveaway message
 * @returns The giveaway message with the spcecified id in the specified channel
 */
export const fetchGiveawayMessage = async (interaction: SlashOrMessageContextMenu, channelId: Snowflake, messageId: Snowflake) => {
	if (interaction.isContextMenuCommand()) return interaction.targetMessage;
	const { client } = interaction;
	DiscordClient.assertReadyClient(client);
	const giveawayChannel = client.getVisibleChannel(channelId);
	const message = await giveawayChannel.messages.fetch(messageId);
	return message;
};

/**
 * Gives a member a milestone.
 *
 * @param userId - The target member's id
 * @param guildId - The target member's guild id
 * @param milestoneName - The name of the milestone to grant
 * @returns The member's database document pre-update
 */
export const grantMilestone = (userId: Snowflake, guildId: Snowflake, milestoneName: string) => memberModel.updateOne(
	{ userId, guildId },
	{ $addToSet: { milestones: milestoneName } },
	{ upsert: true }
);

/**
 * Handles a client disonnection.
 *
 * @param e - The error message caught after disconnecting
 */
export const handleDisconnect = (e: unknown) => {
	console.error(e);
	process.exit();
};

/**
 * Returns whether a string is a key of an object, or whether the string is a member of an enum.
 *
 * @param str - A potential key to an object
 * @param obj - An object that may have the key
 * @returns Whether the string is a key of the object
 */
export const isKey = <T extends Record<string, unknown>>(str: string, obj: T): str is string & keyof T => str in obj;

/**
 * Filters a message component collector to only allow the initial interaction's user to interact with the components.
 *
 * @param interaction - The initial interaction
 * @returns A function that checks whether the user who interacted with the components is the initial interaction's user
 */
export const messageComponentCollectorFilter = (interaction: BaseInteraction) => (i: MessageComponentInteraction) => {
	if (i.user.id === interaction.user.id) return true;
	i.reply({ content: 'Only the command user can use this.', ephemeral: true });
	return false;
};

/**
 * Paginates items across an embed.
 *
 * @param interaction - The command interaction that initiated this function call
 * @param message - The message containing the embed
 * @param embed - The embed in its initial state
 * @param buttons - The buttons used to move across pages
 * @param itemName - The displayed name for the items being paginated
 * @param items - An array of paginated items
 * @param inc - The amount of items shown per page
 */
export const paginate = (interaction: CommandInteraction, message: Message, embed: EmbedBuilder, buttons: PaginationButtons, itemName: string, items: string[], inc = 25) => {
	const row = new ActionRowBuilder<ButtonBuilder>({ components: buttons });
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
			const getDescription = () => `${underscore(`${itemName} (${items.length}):`)}\n${items.slice(index, index + inc).join('\n')}`;

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
						embeds: [embed.setDescription(getDescription())]
					});
					break;
				}
				case 'back': {
					index -= inc;
					embed.setDescription(getDescription());
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
					embed.setDescription(getDescription());
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
						embeds: [embed.setDescription(getDescription())]
					});
				}
			}
		})
		.once('end', async (collected, reason) => {
			if (reason === 'time') {
				try {
					await interaction.editReply({ components: [] });
				}
				catch (error) {
					const errorCodes: (string | number)[] = [RESTJSONErrorCodes.InvalidWebhookToken, RESTJSONErrorCodes.UnknownMessage];
					if (!(error instanceof DiscordAPIError) || !errorCodes.includes(error.code)) throw error;
				}
			}
		});
};

/**
 * Picks new entrants to win a giveaway.
 *
 * @param interaction - The command interaction that initiated this function call
 */
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

	const winnersDisplay = newWinners.map((id, i) => `${newWinners.length === 1 ? '' : `${i + 1}. `}${userMention(id)} (${id})`).join('\n');

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

/**
 * Responds with a paginated embed displaying information about a giveaway.
 *
 * @param interaction - The command interaction that initiated this function call
 */
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

	const entrants = Object.entries(quantify(giveaway.entrants)).map(([name, amount], index) => `${index + 1}. ${userMention(name)}${amount > 1 ? ` x${amount}` : ''}`);

	const embed = new EmbedBuilder()
		.setTitle(giveawayMessage.embeds[0].title)
		.setThumbnail(interaction.guild.iconURL())
		.setColor('Blue')
		.setDescription(`Entrants (${entrants.length}):\n${entrants.slice(0, inc).join('\n') || 'None'}`)
		.setFields([
			{ name: 'Message', value: hyperlink('Link', giveawayMessage.url), inline: true },
			{ name: 'Channel', value: channelMention(giveaway.channelId), inline: true },
			{ name: 'Winners', value: giveaway.completed ? giveaway.winners.map((id, i) => `${i >= giveaway.winnerNumber ? '*' : ''}${i + 1}. ${userMention(id)}${i >= giveaway.winnerNumber ? '*' : ''}`).join('\n') || 'None' : giveaway.winnerNumber.toString(), inline: true },
			{ name: 'Time', value: `${time(giveaway.startTime)} - ${time(giveaway.endTime)}> `, inline: true },
			{ name: 'Role Bonuses', value: giveaway.bonusRoles.length === 0 ? 'None' : giveaway.bonusRoles.map(r => `${interaction.guild.roles.cache.get(r.id)?.name ?? 'Deleted Role'}: ${r.amount} Entries`).join('\n'), inline: true }
		]);

	const willUseButtons = entrants.length > inc;
	const buttons = createPaginationButtons();

	const message = await interaction.reply({ components: willUseButtons ? [new ActionRowBuilder<ButtonBuilder>({ components: buttons })] : [], embeds: [embed], fetchReply: true, ephemeral: true });

	if (willUseButtons) paginate(interaction, message, embed, buttons, 'Entrants', entrants, inc);
};

/**
 * Responds with an embed listing a members's milestones in a guild.
 *
 * @param interaction - The command interaction that initiated this function call
 */
export const viewMilestones = async (interaction: ChatInputCommandInteraction | UserContextMenuCommandInteraction) => {
	if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);

	const { guildId } = interaction;
	const member = (interaction.isChatInputCommand() ? interaction.options.getMember('member') : interaction.targetMember) ?? interaction.member;
	const { displayName } = member;
	const user = await member.user.fetch();

	const { milestones: memberMilestones } = await memberModel.findOneAndUpdate({ userId: member.id, guildId }, {}, { new: true, upsert: true });

	const embed = new EmbedBuilder()
		.setTitle(`${formatPossessive(displayName)} Milestones`)
		.setThumbnail(member.displayAvatarURL())
		.setColor(user.accentColor ?? null);

	if (memberMilestones.length === 0) {
		embed.setDescription('No milestones');
	}
	else {
		const { milestones: guildMilestones } = await guildModel.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });

		memberMilestones.sort((a, b) => {
			const fullA = guildMilestones.find(m => m.name === a);
			const fullB = guildMilestones.find(m => m.name === b);

			if (fullA === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', a));
			if (fullB === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', b));
			if (!isKey(fullA.rarity, RarityOrdering)) {
				throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', fullA.rarity));
			}
			else if (!isKey(fullB.rarity, RarityOrdering)) {
				throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', fullB.rarity));
			}

			return fullA.rarity === fullB.rarity ? fullA.name > fullB.name ? 1 : -1 : RarityOrdering[fullA.rarity] - RarityOrdering[fullB.rarity];
		});

		let i = 0;
		for (const milestone of memberMilestones) {
			const guildMilestone = guildMilestones.find(m => m.name === milestone);
			if (guildMilestone === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', milestone));
			if (i < 25) embed.addFields([{ name: milestone, value: guildMilestone.description, inline: true }]);
			i++;
		}
	}

	await interaction.reply({ embeds: [embed], ephemeral: interaction.isContextMenuCommand() ? true : (interaction.options.getBoolean('ephemeral') ?? false) });
};