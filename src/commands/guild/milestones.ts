import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType } from 'discord.js';
import { viewMilestones } from '../../util/functions.js';

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
	async execute(interaction) {
		await viewMilestones(interaction);
	}
});