import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType, Input, TimeWindow } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import { PlatformChoices } from '../../util/constants.js';
import { sendStatsImages } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'stats',
	description: 'Display a Fortnite player\'s stats',
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
			name: 'input',
			description: 'The control input whose stats to display; defaults to All',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'All', value: 'all' },
				{ name: 'Keyboard and Mouse', value: 'keyboardMouse' },
				{ name: 'Controller', value: 'gamepad' },
				{ name: 'Touch', value: 'touch' }
			]
		},
		{
			name: 'timewindow',
			description: 'The window of time to view stats during; defaults to Lifetime',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'Lifetime', value: 'lifetime' },
				{ name: 'Season', value: 'season' }
			]
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
		const input = (interaction.options.getString('input') ?? 'all') as Input;
		const timeWindow = (interaction.options.getString('timewindow') ?? 'lifetime') as TimeWindow;
		await sendStatsImages(interaction, {
			targetUser: interaction.user,
			accountName,
			accountType,
			input,
			timeWindow
		});
	}
});