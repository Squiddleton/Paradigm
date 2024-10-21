import { SlashCommand } from '@squiddleton/discordjs-util';
import { EpicAPIError } from '@squiddleton/epic';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import { PlatformChoices } from '../../util/constants.js';
import { getLevelsString, linkEpicAccount } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'levels',
	description: 'Display a Fortnite player\'s Battle Pass levels since Chapter 2, Season 1',
	options: [
		{
			name: 'player',
			description: 'The player\'s username; defaults to your linked account, if any',
			type: ApplicationCommandOptionType.String
		},
		{
			name: 'user',
			description: 'The player who linked their Epic account with the bot; defaults to yourself or the "player" option',
			type: ApplicationCommandOptionType.User
		},
		{
			name: 'platform',
			description: 'The player\'s platform; defaults to Epic',
			type: ApplicationCommandOptionType.String,
			choices: PlatformChoices
		},
		{
			name: 'link',
			description: 'Whether to link this player\'s account with the bot; defaults to false',
			type: ApplicationCommandOptionType.Boolean
		}
	],
	scope: 'Global',
	async execute(interaction) {
		const accountName = interaction.options.getString('player');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;
		const user = interaction.options.getUser('user');

		await interaction.deferReply();

		try {
			const { account, ...content } = await getLevelsString({
				targetUser: user ?? interaction.user,
				accountName,
				accountType
			});

			await interaction.editReply(content);
			if (account !== undefined && user === null && interaction.options.getBoolean('link')) {
				await linkEpicAccount(interaction, account, true);
			}
		}
		catch (error) {
			if (error instanceof EpicAPIError && error.status === 504) {
				await interaction.editReply('Epic Games\' response timed out. Please try again in a few minutes.');
				return;
			}
			throw error;
		}
	}
});