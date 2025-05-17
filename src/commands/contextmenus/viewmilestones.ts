import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType, ApplicationIntegrationType } from 'discord.js';
import { viewMilestones } from '../../util/functions.js';
import { ErrorMessage } from '../../util/constants.js';

export default new ContextMenu({
	name: 'View Milestones',
	type: ApplicationCommandType.User,
	scope: 'Guild',
	integrationTypes: [ApplicationIntegrationType.GuildInstall],
	async execute(interaction) {
		if (!interaction.inCachedGuild())
			throw new Error(ErrorMessage.OutOfCachedGuild);
		await viewMilestones(interaction);
	}
});