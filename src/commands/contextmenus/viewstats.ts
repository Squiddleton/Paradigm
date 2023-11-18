import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType } from 'discord.js';
import { getLevelsString, sendStatsImages } from '../../util/fortnite.js';
import type { LevelCommandOptions } from '../../util/types.js';

export default new ContextMenu({
	name: 'View Stats',
	type: ApplicationCommandType.User,
	scope: 'Global',
	async execute(interaction, client) {
		const levelsOptions: LevelCommandOptions = {
			targetUser: interaction.targetUser,
			accountName: null,
			accountType: 'epic'
		};

		const { content } = await getLevelsString(client, levelsOptions);

		await sendStatsImages(interaction, {
			...levelsOptions,
			content,
			input: 'all',
			timeWindow: 'lifetime'
		});
	}
});