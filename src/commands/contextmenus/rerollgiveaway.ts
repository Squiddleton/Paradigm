import { ApplicationCommandType, PermissionFlagsBits } from 'discord.js';
import { ContextMenu } from '@squiddleton/discordjs-util';
import { rerollGiveaway } from '../../util/functions';

export default new ContextMenu({
	name: 'Reroll Giveaway',
	type: ApplicationCommandType.Message,
	permissions: PermissionFlagsBits.ManageGuild,
	scope: 'Guild',
	async execute(interaction) {
		await rerollGiveaway(interaction);
	}
});