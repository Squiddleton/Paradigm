import { ApplicationCommandType } from 'discord.js';
import { ContextMenu } from '@squiddleton/discordjs-util';
import { getLevelsString, getStatsImage } from '../../util/fortnite';
import type { LevelCommandOptions } from '../../util/types';

export default new ContextMenu({
	name: 'View Stats',
	type: ApplicationCommandType.User,
	scope: 'Global',
	async execute(interaction) {
		const levelsOptions: LevelCommandOptions = {
			targetUser: interaction.targetUser,
			accountName: null,
			accountType: 'epic'
		};

		const { content } = await getLevelsString(interaction.client, levelsOptions);

		await getStatsImage(interaction, {
			...levelsOptions,
			input: 'all',
			timeWindow: 'lifetime'
		}, content);
	}
});