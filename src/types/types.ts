import { ApplicationCommandData, ApplicationCommandOptionData, Awaitable, ChatInputCommandInteraction, ClientEvents, PermissionResolvable } from 'discord.js';
import { Client } from '../client';

export interface EventData<T extends keyof ClientEvents> {
	name: T;
	once?: boolean;
	execute: (...params: ClientEvents[T]) => Awaitable<void>;
}

export class Event<T extends keyof ClientEvents> implements EventData<T> {
	name: T;
	once = false;
	execute: (...params: ClientEvents[T]) => Awaitable<void>;
	constructor(data: EventData<T>) {
		this.name = data.name;
		this.once = data.once ?? false;
		this.execute = data.execute;
	}
}

export type Quantity = { [key: string]: number };


export interface SlashCommandData {
	name: string;
	description: string;
	options?: ApplicationCommandOptionData[];
	global?: boolean;
	permissions?: PermissionResolvable[];
	devOnly?: boolean;
	execute: (interaction: ChatInputCommandInteraction, client: Client<true>) => Awaitable<void>;
}

export class SlashCommand {
	name: string;
	description: string;
	options: ApplicationCommandOptionData[] = [];
	global = true;
	permissions: PermissionResolvable | null;
	devOnly = false;
	execute: (interaction: ChatInputCommandInteraction, client: Client<true>) => Awaitable<void>;
	constructor(data: SlashCommandData) {
		this.name = data.name;
		this.description = data.description;
		this.options = data.options ?? [];
		this.global = data.global ?? true;
		this.permissions = data.permissions ?? null;
		this.devOnly = data.devOnly ?? false;
		this.execute = data.execute;
	}
	/** Maps the SlashCommand into deployable JSON data */
	toJSON(): ApplicationCommandData {
		return {
			name: this.name,
			description: this.description,
			options: this.options ?? [],
			defaultMemberPermissions: this.permissions
		};
	}
}