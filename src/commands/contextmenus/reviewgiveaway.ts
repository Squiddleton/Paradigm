import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType, PermissionFlagsBits } from 'discord.js';
import { ErrorMessage } from '../../util/constants.js';
import { reviewGiveaway } from '../../util/functions.js';

export default new ContextMenu({
	name: 'Review Giveaway',
	type: ApplicationCommandType.Message,
	permissions: PermissionFlagsBits.ManageGuild,
	scope: 'Guild',
	async execute(interaction) {
		if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);
		await reviewGiveaway(interaction);
	}
});