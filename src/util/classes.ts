import { Client as UtilClient, validateChannel, validateGuild } from '@squiddleton/discordjs-util';
import { ActionRowBuilder, type Client as BaseClient, ChannelType, EmbedBuilder, type GuildBasedChannel, PermissionFlagsBits, type PermissionsBitField, type Snowflake, StringSelectMenuBuilder } from 'discord.js';
import { AccessibleChannelPermissions, DiscordIds, ErrorMessage } from './constants';
import type { AnyGuildTextChannel, RawEpicError } from './types';

export class DiscordClient<Ready extends boolean = boolean> extends UtilClient<Ready> {
	getPermissions(channel: GuildBasedChannel): PermissionsBitField {
		DiscordClient.assertReadyClient(this);
		const permissions = channel.permissionsFor(this.user);
		if (permissions === null) throw new Error(ErrorMessage.UncachedClient);
		return permissions;
	}
	getGuildChannel(channelId: Snowflake, checkPermissions = true): AnyGuildTextChannel {
		DiscordClient.assertReadyClient(this);
		const channel = validateChannel(this, channelId);
		if (channel.type === ChannelType.DM) throw new Error(`The channel "${channelId}" is actually the DM channel for recipient "${channel.recipientId}"`);
		if (checkPermissions && !this.getPermissions(channel).has(AccessibleChannelPermissions)) throw new Error(ErrorMessage.MissingPermissions.replace('{channelId}', channelId));
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

		return { channel, options: { components: [row] } };
	}
	async editNitroRoleMenu(messageId: Snowflake) {
		const { channel, options } = this.#getNitroRoleMenu();
		await channel.messages.edit(messageId, options);
	}
	async sendNitroRoleMenu() {
		const { channel, options } = this.#getNitroRoleMenu();
		await channel.send(options);
	}
	get devChannel() {
		return this.getGuildChannel(DiscordIds.ChannelId.Dev);
	}
	get nitroRoles() {
		DiscordClient.assertReadyClient(this);
		const guild = validateGuild(this, DiscordIds.GuildId.FortniteBR);
		return guild.roles.cache.sort((a, b) => b.position - a.position).filter(r => r.name.includes('Nitro '));
	}
	static assertReadyClient(client: BaseClient): asserts client is DiscordClient<true> {
		if (!client.isReady()) throw new Error(ErrorMessage.UnreadyClient);
	}
}

export class EpicError extends Error {
	status: number;
	numericErrorCode: number | null;
	constructor(message: string, status: number, text: string, numericErrorCode: number | null) {
		super(message);
		this.status = status;
		this.numericErrorCode = numericErrorCode;
		console.error(text);
	}
	static async validate<Res = unknown>(res: Response) {
		if (!res.ok) {
			const text = await res.text();
			let code: number | null;
			try {
				const json: RawEpicError = await res.json();
				code = json.numericErrorCode;
			}
			catch {
				code = null;
			}
			throw new EpicError(`Unexpected Epic response status: ${res.statusText}`, res.status, text, code);
		}
		const json: Res = await res.json();
		return json;
	}
}

export class TimestampedEmbed extends EmbedBuilder {
	constructor() {
		super();
		this.setTimestamp();
	}
}