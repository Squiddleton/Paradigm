import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType, EpicAccount } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { handleStatsError, linkEpicAccount } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'link',
	description: 'Link your Epic Games account with the bot',
	options: [
		{
			name: 'username',
			description: 'Your Epic, Xbox, or PlayStation username',
			type: ApplicationCommandOptionType.String,
			required: true
		},
		{
			name: 'platform',
			description: 'The platform of the provided username; defaults to Epic',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'Epic', value: 'epic' },
				{ name: 'Xbox', value: 'xbl' },
				{ name: 'PlayStation', value: 'psn' }
			]
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;
		let account: EpicAccount;
		try {
			const stats = await fortniteAPI.stats({ name: interaction.options.getString('username', true), accountType });
			account = stats.account;
		}
		catch (error) {
			await handleStatsError(interaction, error, accountType);
			return;
		}

		await linkEpicAccount(interaction, account);
	}
});