import { ActivityType, ChannelType, Client as BaseClient, ClientOptions, Collection, GatewayIntentBits, Options, Partials } from 'discord.js';
import { readdirSync } from 'node:fs';
import config from './config';
import { SlashCommand } from './types';

class Client extends BaseClient {
	commands: Collection<string, SlashCommand>;
	get devChannel() {
		const channel = this.channels.cache.get(config.devChannelId);
		if (channel === undefined) throw new Error('Client#devChannel is not cached, or the provided id is incorrect');
		if (channel.type === ChannelType.GuildText) return channel;
		throw new Error('Client#devChannel did not return a TextChannel');
	}
	get devGuild() {
		const guild = this.guilds.cache.get(config.devGuildId);
		if (guild === undefined) throw new Error('Client#devGuild is not cached, or the provided id is incorrect');
		return guild;
	}
	constructor(options: ClientOptions) {
		super(options);
		this.commands = new Collection();
		for (const folder of readdirSync('./commands')) {
			const commandFiles = readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
			for (const file of commandFiles) {
				import(`../commands/${folder}/${file}`).then(({ default: command }) => {
					if (command instanceof SlashCommand) this.commands.set(command.name, command);
				});
			}
		}
	}
}

export default new Client({
	allowedMentions: {
		parse: ['users']
	},
	failIfNotExists: false,
	intents: [
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent
	],
	makeCache: Options.cacheWithLimits({
		ApplicationCommandManager: 10,
		GuildBanManager: 10,
		GuildInviteManager: 10,
		GuildScheduledEventManager: 10,
		MessageManager: 10,
		PresenceManager: 10,
		ReactionUserManager: 10,
		UserManager: 10
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
