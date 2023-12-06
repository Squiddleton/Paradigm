import { ClientEvent } from '@squiddleton/discordjs-util';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';
import { DiscordClient } from '../util/classes.js';
import { createGuildEmbed } from '../util/functions.js';

export default new ClientEvent({
	name: 'guildDelete',
	async execute(guild) {
		await guildModel.findByIdAndDelete(guild.id);
		await memberModel.deleteMany({ guildId: guild.id });

		const { client } = guild;
		DiscordClient.assertReadyClient(client);
		await client.devChannel.send({ content: `${client.user.displayName} has been removed from a server.`, embeds: [createGuildEmbed(guild, false)] });
	}
});