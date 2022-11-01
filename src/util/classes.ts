import { Client as UtilClient, validateChannel } from '@squiddleton/discordjs-util';
import { Client as BaseClient, EmbedBuilder, EmbedData } from 'discord.js';
import config from '../config';
import type { EpicErrorCode } from './constants';
import type { RawEpicError } from './types';

export class DiscordClient<Ready extends boolean = boolean> extends UtilClient<Ready> {
	get devChannel() {
		if (!this.isReady()) throw new Error('The devChannel property cannot be accessed until the Client is ready');
		return validateChannel(this, config.devChannelId);
	}
	static isReadyClient(client: BaseClient): client is DiscordClient<true> {
		return client.isReady();
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