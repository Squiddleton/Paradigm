import { ClientEvent } from '@squiddleton/discordjs-util';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';

export default new ClientEvent({
	name: 'guildDelete',
	async execute(guild) {
		await guildModel.findByIdAndDelete(guild.id);
		await memberModel.deleteMany({ guildId: guild.id });
	}
});