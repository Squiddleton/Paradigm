import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType, Stats } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType, chatInputApplicationCommandMention } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { DiscordIds, PlatformChoices } from '../../util/constants.js';
import { createRankedImage, handleStatsError, linkEpicAccount } from '../../util/fortnite.js';
import { getUser } from '../../util/users.js';

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
			name: 'season',
			description: 'Which season to check ranked stats in; defaults to current',
			type: ApplicationCommandOptionType.String,
			choices: [
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
		const season = interaction.options.getString('season') ?? 'og';
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		let stats: Stats<false>;
		if (accountName !== null) {
			try {
				stats = await fortniteAPI.stats({ name: accountName, accountType });
			}
			catch (error) {
				await handleStatsError(interaction, error);
				return;
			}
		}
		else {
			const userResult = getUser(interaction.user.id);
			if (userResult === null || userResult.epicAccountId === null) {
				await interaction.editReply(`No player username was provided, and you have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
				return;
			}
			stats = await fortniteAPI.stats({ id: userResult.epicAccountId });

		}

		const buffer = await createRankedImage(stats.account, true, season);
		await interaction.editReply({ files: [buffer] });

		if (interaction.options.getBoolean('link')) await linkEpicAccount(interaction, stats.account);
	}
});