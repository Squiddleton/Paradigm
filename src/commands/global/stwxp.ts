import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType, EmbedBuilder, time } from 'discord.js';
import { PlatformChoices } from '../../util/constants.js';
import { getStats } from '../../util/fortnite.js';
import { callEpicFunction } from '../../util/epic.js';

export default new SlashCommand({
	name: 'stwxp',
	description: 'Show a player\'s weekly Save the World experience',
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
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const accountName = interaction.options.getString('player');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		const stats = await getStats(interaction, accountName, accountType, interaction.options.getUser('user'));
		if (stats === null) return;

		const profile = await callEpicFunction(client => client.fortnite.postMCPOperation('QueryPublicProfile', 'campaign', undefined, 'public', stats.account.id));

		// @ts-expect-error Checked as of 12/5/24
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
		const attributes = Object.values(profile.profileChanges[0].profile.items).find(v => v.templateId === 'Token:stw_accolade_tracker').attributes as { weekly_xp: number; last_reset: string; last_update: string };

		await interaction.editReply({ embeds: [
			new EmbedBuilder()
				.setTitle(`Save the World XP: ${stats.account.name}`)
				.setFields(
					{ name: 'Current XP', value: attributes.weekly_xp.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',') },
					{ name: 'Maximum XP', value: '4,000,000' },
					{ name: 'Reached Limit?', value: attributes.weekly_xp >= 4_000_000 ? 'Yes' : 'No' },
					{ name: 'Last Weekly XP Reset', value: time(new Date(attributes.last_reset)) }
				)
				.setFooter({ text: 'Last Update' })
				.setTimestamp(new Date(attributes.last_update))
		] });
	}
});