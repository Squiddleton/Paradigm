import { Client as UtilClient, validateChannel } from '@squiddleton/discordjs-util';
import { Client as BaseClient, ChannelType, EmbedBuilder, EmbedData, PermissionFlagsBits, PermissionsBitField, Snowflake } from 'discord.js';
import config from '../config';
import { AccessibleChannelPermissions, EpicErrorCode, ErrorMessage } from './constants';
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
			const permissions = this.getPermissions(channel);
			if (!permissions.has(AccessibleChannelPermissions)) throw new Error(ErrorMessage.MissingPermissions.replace('{channelId}', channelId));
		}
		return channel;
	}
	getVisibleChannel(channelId: Snowflake) {
		const channel = this.getGuildChannel(channelId, false);
		const permissions = this.getPermissions(channel);
		if (!permissions.has(PermissionFlagsBits.ViewChannel)) throw new Error(ErrorMessage.InvisibleChannel.replace('{channelId}', channelId));
		return channel;
	}
	get devChannel() {
		return this.getGuildChannel(config.devChannelId);
	}
	static assertReadyClient(client: BaseClient): asserts client is DiscordClient<true> {
		if (!client.isReady()) throw new Error(ErrorMessage.UnreadyClient);
	}
}

export class EpicError extends Error {
	errorCode: string;
	messageVars: unknown[];
	numericErrorCode: EpicErrorCode | number;
	originatingService: string;
	intent: string;
	errorDescription: string | null;
	error: string | null;
	constructor(error: RawEpicError) {
		super(error.errorMessage);
		this.errorCode = error.errorCode;
		this.messageVars = error.messageVars;
		this.numericErrorCode = error.numericErrorCode;
		this.originatingService = error.originatingService;
		this.intent = error.intent;
		this.errorDescription = error.error_description ?? null;
		this.error = error.error ?? null;
	}
	static isRawEpicError(obj: any): obj is RawEpicError {
		return 'errorCode' in obj;
	}
}

export class TimestampedEmbed extends EmbedBuilder {
	constructor(data?: EmbedData) {
		super(data);
		this.setTimestamp();
	}
}