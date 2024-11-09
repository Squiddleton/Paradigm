import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType, EmbedBuilder, type ApplicationCommandStringOption } from 'discord.js';
import { PlatformChoices } from '../../util/constants.js';
import { getStats } from '../../util/fortnite.js';
import { getRankedStats } from '../../util/epic.js';

export default new SlashCommand({
	name: 'ranked-stats',
	description: 'Display a Fortnite player\'s specific Ranked stats',
	options: [
		{
			name: 'mode',
			description: 'The mode to retrieve stats in',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'Battle Royale', value: 'habanero' }, // TODO: only include habaneroduo, etc.
				{ name: 'Zero Build', value: 'nobuildbr_habanero' },
				{ name: 'Reload - Venture', value: 'habanero_blastberry' },
				{ name: 'Reload Zero Build - Venture', value: 'habanero_nobuild_blastberry' },
				{ name: 'Reload - Oasis', value: 'habanero_punchberry' },
				{ name: 'Reload Zero Build - Oasis', value: 'habanero_nobuild_punchberry' }
			],
			required: true
		},
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
		await interaction.deferReply();

		const accountName = interaction.options.getString('player');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;
		const mode = interaction.options.getString('mode', true);

		const fnAPIStats = await getStats(interaction, accountName, accountType, interaction.options.getUser('user'));
		if (fnAPIStats === null) return;

		const accountId = fnAPIStats.account.id;
		const stats = await getRankedStats(accountId);

		if (stats === null) {
			await interaction.editReply('An error occurred, please try again later.');
			return;
		}

		const getStat = (stat: string) => {
			const modes = mode === 'habanero'
				? ['habanerosolo', 'habaneroduo', 'habanerotrio', 'habanerosquad']
				: [mode];
			return Object.entries(stats)
				.filter(s => modes.some(m => s[0].includes(m)) && s[0].includes(`${stat}_`))
				.reduce((prev, curr) => prev + (curr[1] ?? 0), 0);
		};

		await interaction.client.application.commands.fetch();
		const modeName = interaction.command?.options.find((o): o is ApplicationCommandStringOption => o.name === 'mode' && o.type === ApplicationCommandOptionType.String)?.choices?.find(c => c.value === mode)?.name ?? mode;
		const embed = new EmbedBuilder()
			.setTitle(`Ranked Stats for ${fnAPIStats.account.name} in ${modeName}`)
			.setFields([
				{ name: 'Kills', value: getStat('kills').toString(), inline: true },
				{ name: 'Wins', value: getStat('top1').toString(), inline: true },
				{ name: 'Matches Played', value: getStat('matchesplayed').toString(), inline: true },
				{ name: 'Win Rate', value: `${(getStat('top1') / getStat('matchesplayed') * 100).toFixed(2) || 0}%`, inline: true },
				{ name: 'Average Kills per Match', value: ((getStat('kills') / getStat('matchesplayed')).toFixed(2) || 0).toString(), inline: true }
			]);

		await interaction.editReply({ embeds: [embed] });
	}
});