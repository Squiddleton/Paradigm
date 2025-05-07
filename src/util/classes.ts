import { Client as UtilClient, validateChannel } from '@squiddleton/discordjs-util';
import { type Client as BaseClient, ChannelType, type GuildBasedChannel, PermissionFlagsBits, type PermissionsBitField, type Snowflake } from 'discord.js';
import { AccessibleChannelPermissions, DiscordIds, ErrorMessage } from './constants.js';
import type { AnyGuildTextChannel } from './types.js';

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
		if (channel.type === ChannelType.GroupDM) throw new Error(`The channel "${channelId}" is actually the group DM channel for recipients "${channel.recipients.map(r => r.username).join(', ')}"`);
		if (checkPermissions && !this.getPermissions(channel).has(AccessibleChannelPermissions)) throw new Error(ErrorMessage.MissingPermissions.replace('{channelId}', channelId));
		return channel;
	}

	getVisibleChannel(channelId: Snowflake) {
		const channel = this.getGuildChannel(channelId, false);
		if (!this.getPermissions(channel).has(PermissionFlagsBits.ViewChannel)) throw new Error(ErrorMessage.InvisibleChannel.replace('{channelId}', channelId));
		return channel;
	}

	get devChannel() {
		return this.getGuildChannel(DiscordIds.ChannelId.Dev);
	}

	static assertReadyClient(client: BaseClient): asserts client is DiscordClient<true> {
		if (!client.isReady()) throw new Error(ErrorMessage.UnreadyClient);
	}
}