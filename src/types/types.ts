import { ApplicationCommandData, ApplicationCommandOptionChoiceData, ApplicationCommandOptionData, ApplicationCommandType, Awaitable, ChatInputCommandInteraction, ClientEvents, MessageContextMenuCommandInteraction, PermissionResolvable, UserContextMenuCommandInteraction } from 'discord.js';
import { Client } from '../clients/discord.js';

export type Scope = 'Dev' | 'Exclusive' | 'Global' | 'Guild';

export interface BaseCommandData {
	name: string;
	permissions?: PermissionResolvable[];
	scope: Scope;
}

export abstract class BaseCommand {
	name: string;
	permissions: PermissionResolvable | null;
	scope: Scope;
	constructor(data: BaseCommandData) {
		this.name = data.name;
		this.permissions = data.permissions ?? null;
		this.scope = data.scope;
	}
}

export interface SlashCommandData extends BaseCommandData {
	description: string;
	options?: ApplicationCommandOptionData[];
	execute: (interaction: ChatInputCommandInteraction, client: Client<true>) => Awaitable<void>;
}

export class SlashCommand extends BaseCommand {
	description: string;
	options: ApplicationCommandOptionData[] = [];
	execute: (interaction: ChatInputCommandInteraction, client: Client<true>) => Awaitable<void>;
	constructor(data: SlashCommandData) {
		super(data);
		this.description = data.description;
		this.options = data.options ?? [];
		this.execute = data.execute;
	}
	/** Maps the SlashCommand into deployable JSON data */
	toJSON(): ApplicationCommandData {
		return {
			name: this.name,
			description: this.description,
			options: this.options ?? [],
			defaultMemberPermissions: this.permissions,
			dmPermission: this.scope === 'Global'
		};
	}
}

export type ContextMenuType = Exclude<ApplicationCommandType, ApplicationCommandType.ChatInput>;

export interface ContextMenuData<Type extends ContextMenuType> extends BaseCommandData {
	type: Type;
	execute: Type extends ApplicationCommandType.Message
		? (interaction: MessageContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>
		: (interaction: UserContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>;
}

export class ContextMenu<Type extends ContextMenuType> extends BaseCommand {
	type: Type;
	execute: Type extends ApplicationCommandType.Message
		? (interaction: MessageContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>
		: (interaction: UserContextMenuCommandInteraction, client: Client<true>) => Awaitable<void>;
	constructor(data: ContextMenuData<Type>) {
		super(data);
		this.type = data.type;
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
			dmPermission: this.scope === 'Global'
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

export const LanguageChoices: ApplicationCommandOptionChoiceData[] = Object.entries({
	ar: 'اَلْعَرَبِيَّةُ',
	de: 'Deutsch',
	en: 'English',
	es: 'Español',
	'es-419': 'Español (América Latina)',
	fr: 'Français',
	it: 'Italiano',
	ja: '日本語',
	ko: '한국어',
	pl: 'Język Polski',
	'pt-BR': 'Português',
	ru: 'Русский язык',
	tr: 'Türkçe',
	'zh-CN': '官话',
	'zh-Hant': '官話'
}).map(([key, value]) => ({ name: value, value: key }));

export type Quantity = { [key: string]: number };