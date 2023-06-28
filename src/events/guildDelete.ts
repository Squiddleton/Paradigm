import { ClientEvent } from '@squiddleton/discordjs-util';
import { DiscordClient } from '../util/classes.js';

export default new ClientEvent({
	name: 'guildDelete',
	async execute(guild) {
		const { client } = guild;
		DiscordClient.assertReadyClient(client);
		await client.devChannel.send(`${client.user.username} has been removed from ${guild.name}.`);
	}
});