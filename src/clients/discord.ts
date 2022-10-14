declare function require(name:string): any;
import { ActivityType, GatewayIntentBits, Options, Partials } from 'discord.js';
import { readdirSync } from 'node:fs';
import config from '../config.js';
import { Client as BaseClient, ClientEvent, ContextMenu, ContextMenuType, SlashCommand, validateChannel } from '@squiddleton/discordjs-util';
import { ErrorMessages } from '../util/constants.js';

const commands: (SlashCommand | ContextMenu<ContextMenuType>)[] = [];
for (const folder of readdirSync('./dist/commands')) {
	const commandFiles = readdirSync(`./dist/commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const { default: command } = require(`../commands/${folder}/${file}`);
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
	events: readdirSync('./dist/events').filter(file => file.endsWith('.js')).map(file => {
		const { default: event } = require(`../events/${file}`);
		if (event instanceof ClientEvent) {
			return event;
		}
		else {
			throw new Error(ErrorMessages.UnexpectedValue.replace('{value}', typeof event));
		}
	}),
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
			name: 'Nothing is Inevitable',
			type: ActivityType.Listening
		}]
	}
});

export default client;