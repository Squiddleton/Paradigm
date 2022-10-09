import { ActivityType, GatewayIntentBits, Options, Partials } from 'discord.js';
import { readdirSync } from 'node:fs';
import config from '../config.js';
import { Client as BaseClient, ClientEvent, ContextMenu, ContextMenuType, SlashCommand, validateChannel } from '@squiddleton/discordjs-util';

const commands: (SlashCommand | ContextMenu<ContextMenuType>)[] = [];
for (const folder of readdirSync('./dist/commands')) {
	const commandFiles = readdirSync(`./dist/commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const { default: command } = await import(`../commands/${folder}/${file}`);
		if (command instanceof ContextMenu || command instanceof SlashCommand) commands.push(command);
	}
}

export class Client<Ready extends boolean = boolean> extends BaseClient<Ready> {
	get devChannel() {
		if (!this.isReady()) throw new Error('The devChannel property cannot be accessed until the Client is ready');
		return validateChannel(this, config.devChannelId);
	}
}

const client = new Client({
	allowedMentions: {
		parse: ['users']
	},
	commands,
	devGuildId: config.devGuildId,
	exclusiveGuildId: config.exclusiveGuildId,
	failIfNotExists: false,
	intents: [
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers
	],
	makeCache: Options.cacheWithLimits({
		ApplicationCommandManager: 10,
		GuildBanManager: 10,
		GuildInviteManager: 10,
		GuildScheduledEventManager: 10,
		MessageManager: 10,
		PresenceManager: 10,
		ReactionUserManager: 10
	}),
	partials: [
		Partials.Message,
		Partials.Reaction
	],
	presence: {
		activities: [{
			name: 'Lil\' Whip (Mmm!)',
			type: ActivityType.Listening
		}]
	}
});

const eventFiles = readdirSync('./dist/events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
	import(`../events/${file}`).then(({ default: event }) => {
		if (event instanceof ClientEvent) {
			if (event.once) {
				client.once(event.name, event.execute);
			}
			else {
				client.on(event.name, event.execute);
			}
		}
	});
}

export default client;