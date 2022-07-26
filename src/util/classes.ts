import { Client as UtilClient, validateChannel, validateGuild } from '@squiddleton/discordjs-util';
import { ActionRowBuilder, Client as BaseClient, ChannelType, EmbedBuilder, PermissionFlagsBits, PermissionsBitField, Snowflake, StringSelectMenuBuilder } from 'discord.js';
import { AccessibleChannelPermissions, DiscordIds, ErrorMessage } from './constants';
import type { AnyGuildTextChannel, RawEpicError } from './types';

export class DiscordClient<Ready extends boolean = boolean> extends UtilClient<Ready> {
	getPermissions(channel: AnyGuildTextChannel): PermissionsBitField {
		DiscordClient.assertReadyClient(this);
		const permissions = channel.permissionsFor(this.user);
		if (permissions === null) throw new Error(ErrorMessage.UncachedClient);
		return permissions;
	}
	getGuildChannel(channelId: Snowflake, checkPermissions = true): AnyGuildTextChannel {
		DiscordClient.assertReadyClient(this);
		const channel = validateChannel(this, channelId);
		if (channel.type === ChannelType.DM) throw new Error(`The channel "${channelId}" is actually the DM channel for recipient "${channel.recipientId}"`);

		if (checkPermissions) {
			if (!this.getPermissions(channel).has(AccessibleChannelPermissions)) throw new Error(ErrorMessage.MissingPermissions.replace('{channelId}', channelId));
		}
		return channel;
	}
	getVisibleChannel(channelId: Snowflake) {
		const channel = this.getGuildChannel(channelId, false);
		if (!this.getPermissions(channel).has(PermissionFlagsBits.ViewChannel)) throw new Error(ErrorMessage.InvisibleChannel.replace('{channelId}', channelId));
		return channel;
	}
	#getNitroRoleMenu() {
		const channel = this.getGuildChannel(DiscordIds.ChannelId.RoleAssignment);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
			new StringSelectMenuBuilder()
				.setCustomId('nitro-roles')
				.setPlaceholder('Add a Nitro color role!')
				.setOptions(
					this.nitroRoles.map(r => ({
						label: r.id === DiscordIds.RoleId.NitroBooster ? 'Remove Colors' : r.name.replace('Nitro ', ''),
						value: r.id
					}))
				)
		);

		return { channel, components: [row] };
	}
	async editNitroRoleMenu(messageId: Snowflake) {
		const { channel, components } = this.#getNitroRoleMenu();
		await channel.messages.edit(messageId, { components });
	}
	async sendNitroRoleMenu() {
		const { channel, components } = this.#getNitroRoleMenu();
		await channel.send({ components });
	}
	get devChannel() {
		return this.getGuildChannel(DiscordIds.ChannelId.Dev);
	}
	get nitroRoles() {
		DiscordClient.assertReadyClient(this);
		const guild = validateGuild(this, DiscordIds.GuildId.RFortniteBR);
		return guild.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.name.includes('Nitro '));
	}
	static assertReadyClient(client: BaseClient): asserts client is DiscordClient<true> {
		if (!client.isReady()) throw new Error(ErrorMessage.UnreadyClient);
	}
}

export class EpicError extends Error {
	raw: RawEpicError;
	constructor(error: RawEpicError) {
		super(error.errorMessage);
		this.raw = error;
	}
	static isRawEpicError(obj: any): obj is RawEpicError {
		return 'errorCode' in obj;
	}
}

export class TimestampedEmbed extends EmbedBuilder {
	constructor() {
		super();
		this.setTimestamp();
	}
}