import { validateChannel } from '@squiddleton/discordjs-util';
import { ChannelType, ChatInputCommandInteraction, Client, Colors, EmbedBuilder, Guild, MessageComponentInteraction, PermissionFlagsBits, Snowflake, time } from 'discord.js';
import type { DiscordClient } from '../clients/discord.js';
import { AccessibleChannelPermissions, ErrorMessage } from './constants.js';
import type { AnyGuildTextChannel, IGiveaway, IMessage, Quantity } from './types.js';

export const createGiveawayEmbed = (giveaway: IGiveaway | Omit<IGiveaway, 'messageId'>, guild: Guild, ended = false) => {
	const embed = new EmbedBuilder()
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
		)
		.setTimestamp();
	if (giveaway.bonusRoles.length > 0) embed.addFields({ name: 'Role Bonuses', value: giveaway.bonusRoles.map(role => `${guild.roles.cache.get(role.id)?.name}: +${role.amount} Entries`).join('\n'), inline: true });

	return embed;
};

export const getClientPermissions = (client: Client<true>, channel: AnyGuildTextChannel) => {
	const permissions = channel.permissionsFor(client.user);
	if (permissions === null) throw new Error(ErrorMessage.UncachedClient);
	return permissions;
};

export const getEnumKeys = (e: Record<string, any>) => Object.keys(e).filter(x => !(parseInt(x) >= 0));

export const isReadyClient = (client: Client): client is DiscordClient<true> => client.isReady();

export const messageComponentCollectorFilter = (interaction: ChatInputCommandInteraction) => (i: MessageComponentInteraction) => {
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