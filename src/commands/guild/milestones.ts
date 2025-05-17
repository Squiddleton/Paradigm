import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, ApplicationIntegrationType } from 'discord.js';
import { viewMilestones } from '../../util/functions.js';
import { ErrorMessage } from '../../util/constants.js';

export default new SlashCommand({
	name: 'milestones',
	description: 'List a member\'s milestones',
	options: [
		{
			name: 'member',
			description: 'The member whose milestones to display; defualts to yourself',
			type: ApplicationCommandOptionType.User
		},
		{
			name: 'ephemeral',
			description: 'Whether to make the reply only visible to yourself; defaults to false',
			type: ApplicationCommandOptionType.Boolean
		}
	],
	scope: 'Guild',
	integrationTypes: [ApplicationIntegrationType.GuildInstall],
	async execute(interaction) {
		if (!interaction.inCachedGuild())
			throw new Error(ErrorMessage.OutOfCachedGuild);
		await viewMilestones(interaction);
	}
});