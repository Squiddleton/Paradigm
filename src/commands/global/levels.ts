import { ApplicationCommandOptionType } from 'discord.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { PlatformChoices } from '../../util/constants.js';
import { getLevelsString } from '../../util/fortnite.js';
import { linkEpicAccount } from '../../util/functions.js';

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
		const accountType = (interaction.options.getString('platform') ?? 'epic') as 'epic' | 'xbl' | 'psn';

		const { account, ...content } = await getLevelsString(interaction.client, {
			targetUser: interaction.user,
			accountName,
			accountType
		});

		await interaction.reply(content);
		if (account !== undefined && interaction.options.getBoolean('link')) {
			await linkEpicAccount(interaction, account);
		}
	}
});