import { Awaitable, ClientEvents } from 'discord.js';

export interface EventData<T extends keyof ClientEvents> {
	name: T
	once?: boolean
    execute: (...params: ClientEvents[T]) => Awaitable<void>
}

export class Event<T extends keyof ClientEvents> {
	name: T;
	once?: boolean;
	execute: (...params: ClientEvents[T]) => Awaitable<void>;
	constructor(data: EventData<T>) {
		this.name = data.name;
		this.once = data.once;
		this.execute = data.execute;
	}
}