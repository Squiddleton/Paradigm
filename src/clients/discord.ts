import { readdirSync } from 'node:fs';
import { ClientEvent, ContextMenu, type ContextMenuType, SlashCommand } from '@squiddleton/discordjs-util';
import { ActivityType, GatewayIntentBits, type GuildMember, Options, Partials, type User } from 'discord.js';
import { DiscordClient } from '../util/classes.js';
import { DiscordIds, ErrorMessage } from '../util/constants.js';

const commands: (SlashCommand | ContextMenu<ContextMenuType>)[] = [];
for (const folder of readdirSync('./dist/commands')) {
	const commandFiles = readdirSync(`./dist/commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const { default: command } = await import(`../commands/${folder}/${file}`);
		if (command instanceof ContextMenu || command instanceof SlashCommand) commands.push(command);
	}
}

const sweeperFilter = () => (structure: User | GuildMember) => structure.id !== structure.client.user.id;

const client = new DiscordClient({
	allowedMentions: {
		parse: ['users']
	},
	commands,
	devGuildId: DiscordIds.GuildId.Dev,
	events: await Promise.all(
		readdirSync('./dist/events').filter(file => file.endsWith('.js')).map(async file => {
			const { default: event } = await import(`../events/${file}`);
			if (!(event instanceof ClientEvent)) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', typeof event));
			return event;
		})
	),
	exclusiveGuildId: DiscordIds.GuildId.FortniteBR,
	failIfNotExists: false,
	intents: [
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds
	],
	makeCache: Options.cacheWithLimits({
		GuildBanManager: 10,
		GuildInviteManager: 10,
		GuildScheduledEventManager: 10,
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
	},
	sweepers: {
		...Options.DefaultSweeperSettings,
		guildMembers: {
			interval: 3600,
			filter: sweeperFilter
		},
		messages: {
			interval: 1800,
			lifetime: 1200
		},
		users: {
			interval: 3600,
			filter: sweeperFilter
		}
	}
});

export default client;