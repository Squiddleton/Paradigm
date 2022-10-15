import { ApplicationCommandType } from 'discord.js';
import { ContextMenu } from '@squiddleton/discordjs-util';
import { viewMilestones } from '../../util/functions';

export default new ContextMenu({
	name: 'View Milestones',
	type: ApplicationCommandType.User,
	scope: 'Guild',
	async execute(interaction) {
		await viewMilestones(interaction);
	}
});