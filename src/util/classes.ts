import { Client as BaseClient, validateChannel } from '@squiddleton/discordjs-util';
import { EmbedBuilder, EmbedData } from 'discord.js';
import config from '../config';
import type { EpicErrorCode } from './constants';
import type { RawEpicError } from './types';

export class DiscordClient<Ready extends boolean = boolean> extends BaseClient<Ready> {
	get devChannel() {
		if (!this.isReady()) throw new Error('The devChannel property cannot be accessed until the Client is ready');
		return validateChannel(this, config.devChannelId);
	}
}

export class EpicError extends Error {
	errorCode: string;
	errorMessage: string;
	messageVars: unknown[];
	numericErrorCode: EpicErrorCode | number;
	originatingService: string;
	intent: string;
	errorDescription: string | null;
	error: string | null;
	constructor(error: RawEpicError) {
		super(error.errorMessage);
		this.errorCode = error.errorCode;
		this.errorMessage = error.errorMessage;
		this.messageVars = error.messageVars;
		this.numericErrorCode = error.numericErrorCode;
		this.originatingService = error.originatingService;
		this.intent = error.intent;
		this.errorDescription = error.error_description ?? null;
		this.error = error.error ?? null;
	}
}

export class TimestampedEmbed extends EmbedBuilder {
	constructor(data?: EmbedData) {
		super(data);
		this.setTimestamp();
	}
}