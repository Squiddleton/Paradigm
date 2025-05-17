import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType, PermissionFlagsBits } from 'discord.js';
import { ErrorMessage } from '../../util/constants.js';
import { rerollGiveaway } from '../../util/functions.js';

export default new ContextMenu({
	name: 'Reroll Giveaway',
	type: ApplicationCommandType.Message,
	permissions: PermissionFlagsBits.ManageGuild,
	scope: 'Guild',
	async execute(interaction) {
		if (!interaction.inGuild()) throw new Error(ErrorMessage.OutOfGuild);
		await rerollGiveaway(interaction);
	}
});