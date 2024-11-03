import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import { PlatformChoices, RankedTrack } from '../../util/constants.js';
import { createRankedImage, getStats, linkEpicAccount } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'racing',
	description: 'Display a Fortnite player\'s Rocket Racing Ranked stats',
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
				{ name: 'October 2024', value: RankedTrack.Oct24Racing },
				{ name: 'Inferno Island', value: RankedTrack.InfernoIslandRacing },
				{ name: 'Neon Rush', value: RankedTrack.NeonRushRacing },
				{ name: 'Season Zero', value: RankedTrack.S0Racing }
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
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;
		const season = interaction.options.getString('season') ?? RankedTrack.Oct24Racing;

		const stats = await getStats(interaction, accountName, accountType, interaction.options.getUser('user'));
		if (stats === null) return;

		const buffer = await createRankedImage(stats.account, true, 'rr', season);
		if (buffer === null) await interaction.editReply({ content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
		else await interaction.editReply({ files: [buffer] });

		if (interaction.options.getBoolean('link')) await linkEpicAccount(interaction, stats.account);
	}
});