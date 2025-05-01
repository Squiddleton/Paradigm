import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import { PlatformChoices, RankedTrack } from '../../util/constants.js';
import { getStats, linkEpicAccount } from '../../util/fortnite.js';
import { createRankedImage } from '../../util/epic.js';

export default new SlashCommand({
	name: 'ballistic',
	description: 'Display a Fortnite player\'s Ballistic Ranked stats',
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
				{ name: 'R&D Season 1', value: RankedTrack.BallisticRAndDS1 },
				{ name: 'Season Zero', value: RankedTrack.BallisticS0 }
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
		const season = interaction.options.getString('season') as RankedTrack | null;
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		const stats = await getStats(interaction, accountName, accountType, interaction.options.getUser('user'));
		if (stats === null) return;

		const buffer = await createRankedImage(stats.account, true, 'b', season);
		if (buffer === null) await interaction.editReply({ content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
		else await interaction.editReply({ files: [buffer] });

		if (interaction.options.getBoolean('link')) await linkEpicAccount(interaction, stats.account);
	}
});