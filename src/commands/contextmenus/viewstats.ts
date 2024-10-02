import { ContextMenu } from '@squiddleton/discordjs-util';
import { EpicAPIError } from '@squiddleton/epic';
import { ApplicationCommandType } from 'discord.js';
import { getLevelsString, sendStatsImages } from '../../util/fortnite.js';
import type { LevelCommandOptions } from '../../util/types.js';

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

		try {
			const { content } = await getLevelsString(levelsOptions);

			await sendStatsImages(interaction, {
				...levelsOptions,
				content,
				input: 'all',
				timeWindow: 'lifetime'
			});
		}
		catch (error) {
			if (error instanceof EpicAPIError && error.status === 504) {
				await interaction.reply('Epic Games\' response timed out. Please try again in a few minutes.');
				return;
			}
			throw error;
		}
	}
});