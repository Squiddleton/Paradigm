import { ClientEvent } from '@squiddleton/discordjs-util';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';
import { DiscordClient } from '../util/classes.js';

export default new ClientEvent({
	name: 'guildDelete',
	async execute(guild) {
		await guildModel.findByIdAndDelete(guild.id);
		await memberModel.deleteMany({ guildId: guild.id });
		const { client } = guild;
		DiscordClient.assertReadyClient(client);
		await client.devChannel.send(`${client.user.username} has been removed from ${guild.name}.`);
	}
});