import { ApplicationCommandData, ApplicationCommandOptionData, ApplicationCommandType, Awaitable, ChatInputCommandInteraction, ClientEvents, MessageContextMenuCommandInteraction, PermissionResolvable, UserContextMenuCommandInteraction } from 'discord.js';
import { Client } from '../clients/discord.js';

export enum Scope {
	Dev,
	Exclusive,
	Global,
	Guild
}

export type ContextMenuType = Exclude<ApplicationCommandType, ApplicationCommandType.ChatInput>;

export interface ContextMenuData<Type extends ContextMenuType> {
	name: string;
	type: Type;
	permissions?: PermissionResolvable;
	scope: Scope;
	execute: Type extends ApplicationCommandType.Message
		? (interaction: MessageContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>
		: (interaction: UserContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>;
}

export class ContextMenu<Type extends ContextMenuType> {
	name: string;
	type: Type;
	permissions: PermissionResolvable | null;
	scope: Scope;
	execute: Type extends ApplicationCommandType.Message
		? (interaction: MessageContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>
		: (interaction: UserContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>;
	constructor(data: ContextMenuData<Type>) {
		this.name = data.name;
		this.type = data.type;
		this.permissions = data.permissions ?? null;
		this.scope = data.scope;
		this.execute = data.execute;
	}
	isMessage(): this is ContextMenu<ApplicationCommandType.Message> {
		return this.type === ApplicationCommandType.Message;
	}
	isUser(): this is ContextMenu<ApplicationCommandType.User> {
		return this.type === ApplicationCommandType.User;
	}
	/** Maps the ContextMenu into deployable JSON data */
	toJSON(): ApplicationCommandData {
		return {
			name: this.name,
			type: this.type,
			defaultMemberPermissions: this.permissions,
			dmPermission: this.scope === Scope.Global
		};
	}
}

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
	permissions?: PermissionResolvable[];
	scope: Scope;
	execute: (interaction: ChatInputCommandInteraction, client: Client<true>) => Awaitable<void>;
}

export class SlashCommand {
	name: string;
	description: string;
	options: ApplicationCommandOptionData[] = [];
	permissions: PermissionResolvable | null;
	scope: Scope;
	execute: (interaction: ChatInputCommandInteraction, client: Client<true>) => Awaitable<void>;
	constructor(data: SlashCommandData) {
		this.name = data.name;
		this.description = data.description;
		this.options = data.options ?? [];
		this.permissions = data.permissions ?? null;
		this.scope = data.scope;
		this.execute = data.execute;
	}
	/** Maps the SlashCommand into deployable JSON data */
	toJSON(): ApplicationCommandData {
		return {
			name: this.name,
			description: this.description,
			options: this.options ?? [],
			defaultMemberPermissions: this.permissions,
			dmPermission: this.scope === Scope.Global
		};
	}
}