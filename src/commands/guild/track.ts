import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType } from 'discord.js';
import { PlatformChoices, RankedTrack } from '../../util/constants.js';
import { trackedModes } from '../../util/epic.js';
import { getStats } from '../../util/fortnite.js';
import type { AccountType } from '@squiddleton/fortnite-api';

export default new SlashCommand({
	name: 'track',
	description: 'Start or stop tracking your ranked progress',
	options: [
		{
			name: 'mode',
			description: 'Which mode to start or stop tracking ranked stats in',
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{ name: 'Battle Royale', value: RankedTrack.C5S4BR },
				{ name: 'Zero Build', value: RankedTrack.C5S4ZB },
				{ name: 'Reload (BR)', value: RankedTrack.Reload1BR },
				{ name: 'Reload (ZB)', value: RankedTrack.Reload1ZB },
				{ name: 'Rocket Racing', value: RankedTrack.C5S4Racing }
			]
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
		}
	],
	scope: 'Exclusive',
	async execute(interaction) {
		const accountName = interaction.options.getString('player');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		const stats = await getStats(interaction, accountName, accountType, interaction.options.getUser('user'));
		if (stats === null) return;

		const { account } = stats;
		const accountId = account.id;
		const track = interaction.options.getString('mode', true) as RankedTrack.C5S4BR | RankedTrack.C5S4ZB | RankedTrack.C5S4Racing | RankedTrack.Reload1BR | RankedTrack.Reload1ZB;

		if (!trackedModes.has(accountId)) trackedModes.set(accountId, { displayUsername: account.name, trackedModes: [] });
		const trackedUser = trackedModes.get(accountId);
		if (trackedUser === undefined) {
			await interaction.reply('An error occurred while getting the current mode to track.');
			console.error(`No tracked user found for account ${accountId}:`, trackedModes);
			return;
		}

		const trackDisplayName = {
			[RankedTrack.C5S4BR]: 'Battle Royale',
			[RankedTrack.C5S4ZB]: 'Zero Build',
			[RankedTrack.C5S4Racing]: 'Rocket Racing',
			[RankedTrack.Reload1BR]: 'Reload (Battle Royale)',
			[RankedTrack.Reload1ZB]: 'Reload (Zero Build)'
		}[track];
		const existingTrack = trackedUser.trackedModes.find(t => t.trackguid === track);

		if (existingTrack === undefined) {
			trackedUser.trackedModes.push({ trackguid: track, displayName: trackDisplayName });
			await interaction.reply(`Started tracking progress for ${account.name} in ${trackDisplayName}!`);
		}
		else {
			trackedUser.trackedModes.splice(trackedUser.trackedModes.indexOf(existingTrack), 1);
			await interaction.reply(`Stopped tracking progress for ${account.name} in ${trackDisplayName}.`);
		}
	}
});