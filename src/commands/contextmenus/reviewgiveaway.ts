import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType, ApplicationIntegrationType, PermissionFlagsBits } from 'discord.js';
import { ErrorMessage } from '../../util/constants.js';
import { reviewGiveaway } from '../../util/functions.js';

export default new ContextMenu({
	name: 'Review Giveaway',
	type: ApplicationCommandType.Message,
	permissions: PermissionFlagsBits.ManageGuild,
	scope: 'Guild',
	integrationTypes: [ApplicationIntegrationType.GuildInstall],
	async execute(interaction) {
		if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfCachedGuild);
		await reviewGiveaway(interaction);
	}
});