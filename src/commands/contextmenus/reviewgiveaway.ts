import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType, PermissionFlagsBits } from 'discord.js';
import { reviewGiveaway } from '../../util/functions';

export default new ContextMenu({
	name: 'Review Giveaway',
	type: ApplicationCommandType.Message,
	permissions: PermissionFlagsBits.ManageGuild,
	scope: 'Guild',
	async execute(interaction) {
		await reviewGiveaway(interaction);
	}
});