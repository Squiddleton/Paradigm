import { readdir } from 'node:fs/promises';
import { ClientEvent, ContextMenu, type ContextMenuType, SlashCommand } from '@squiddleton/discordjs-util';
import { ActivityType, GatewayIntentBits, type GuildMember, Options, Partials, type User } from 'discord.js';
import { DiscordClient } from '../util/classes.js';
import { DiscordIds, ErrorMessage } from '../util/constants.js';

const commands: (SlashCommand | ContextMenu<ContextMenuType>)[] = [];
for (const folder of await readdir('./dist/commands')) {
	const commandFiles = (await readdir(`./dist/commands/${folder}`)).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const { default: command } = await import(`../commands/${folder}/${file}`) as { default: unknown };
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
		(await readdir('./dist/events')).filter(file => file.endsWith('.js')).map(async file => {
			const { default: event } = await import(`../events/${file}`) as { default: unknown };
			if (!(event instanceof ClientEvent)) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', typeof event));
			return event;
		})
	),
	exclusiveGuildId: DiscordIds.GuildId.Exclusive,
	failIfNotExists: false,
	intents: [
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.Guilds
	],
	makeCache: Options.cacheWithLimits({
		AutoModerationRuleManager: 0,
		BaseGuildEmojiManager: 0,
		DMMessageManager: 0,
		GuildEmojiManager: 0,
		GuildBanManager: 0,
		GuildInviteManager: 0,
		GuildScheduledEventManager: 0,
		GuildStickerManager: 0,
		PresenceManager: 0,
		ReactionManager: 0,
		ReactionUserManager: 0,
		VoiceStateManager: 0
	}),
	partials: [
		Partials.Channel
	],
	presence: {
		activities: [{
			name: 'Bird is the Word',
			type: ActivityType.Listening
		}]
	},
	sweepers: {
		...Options.DefaultSweeperSettings,
		guildMembers: {
			interval: 900,
			filter: sweeperFilter
		},
		messages: {
			interval: 900,
			filter: () => () => true
		},
		users: {
			interval: 900,
			filter: sweeperFilter
		}
	}
});

export default client;