import { ClientEvent } from '@squiddleton/discordjs-util';
import { DiscordClient } from '../util/classes.js';
import { createGuildEmbed } from '../util/functions.js';

export default new ClientEvent({
	name: 'guildCreate',
	async execute(guild) {
		const { client } = guild;
		DiscordClient.assertReadyClient(client);
		await client.devChannel.send({ content: `${client.user.displayName} has been added to a server!`, embeds: [createGuildEmbed(guild, true)] });
	}
});