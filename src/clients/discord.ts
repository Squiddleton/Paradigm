import { readdirSync } from 'node:fs';
import { ClientEvent, ContextMenu, ContextMenuType, SlashCommand } from '@squiddleton/discordjs-util';
import { ActivityType, GatewayIntentBits, Options, Partials } from 'discord.js';
import { DiscordClient } from '../util/classes.js';
import { DiscordIds, ErrorMessage } from '../util/constants.js';

const commands: (SlashCommand | ContextMenu<ContextMenuType>)[] = [];
for (const folder of readdirSync('./dist/commands')) {
	const commandFiles = readdirSync(`./dist/commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const { default: command } = require(`../commands/${folder}/${file}`);
		if (command instanceof ContextMenu || command instanceof SlashCommand) commands.push(command);
	}
}

const client = new DiscordClient({
	allowedMentions: {
		parse: ['users']
	},
	commands,
	devGuildId: DiscordIds.GuildId.Dev,
	events: readdirSync('./dist/events').filter(file => file.endsWith('.js')).map(file => {
		const { default: event } = require(`../events/${file}`);
		if (event instanceof ClientEvent) {
			return event;
		}
		else {
			throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', typeof event));
		}
	}),
	exclusiveGuildId: DiscordIds.GuildId.RFortniteBR,
	failIfNotExists: false,
	intents: [
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds
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
		Partials.Channel,
		Partials.Message,
		Partials.Reaction
	],
	presence: {
		activities: [{
			name: 'Rip & Tear',
			type: ActivityType.Listening
		}]
	}
});

export default client;