import { ClientEvent } from '@squiddleton/discordjs-util';
import { DiscordClient } from '../util/classes.js';

export default new ClientEvent({
	name: 'guildCreate',
	async execute(guild) {
		const { client } = guild;
		DiscordClient.assertReadyClient(client);
		await client.devChannel.send(`${client.user.username} has been added to ${guild.name}!`);
	}
});