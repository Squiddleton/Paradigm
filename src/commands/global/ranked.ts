import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import { PlatformChoices } from '../../util/constants.js';
import { createRankedImage, getStats, linkEpicAccount } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'ranked',
	description: 'Display a Fortnite player\'s Ranked stats',
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
			name: 'season',
			description: 'Which season to check ranked stats in; defaults to current',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'Chapter 5 Season 4', value: 'c5s4' },
				{ name: 'Chapter 5 Season 3', value: 'c5s3' },
				{ name: 'Chapter 5 Season 2', value: 'c5s2' },
				{ name: 'Chapter 5 Season 1', value: 'c5s1' },
				{ name: 'Fortnite: OG', value: 'og' },
				{ name: 'Chapter 4 Season 4', value: 'c4s4' },
				{ name: 'Season Zero', value: 'zero' },
				{ name: 'Season Zero (Pre-Reset)', value: 'zeroprereset' }
			]
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
		await interaction.deferReply();

		const accountName = interaction.options.getString('player');
		const season = interaction.options.getString('season') ?? 'c5s4';
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		const stats = await getStats(interaction, accountName, accountType, interaction.options.getUser('user'));
		if (stats === null) return;

		const buffer = await createRankedImage(stats.account, true, 'br', season);
		if (buffer === null) {
			await interaction.editReply('The Epic Games stats API is currently unavailable. Please try again in a few minutes.');
			return;
		}
		await interaction.editReply({ files: [buffer] });

		if (interaction.options.getBoolean('link')) await linkEpicAccount(interaction, stats.account);
	}
});