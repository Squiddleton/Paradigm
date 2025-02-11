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
				{ name: 'Battle Royale', value: RankedTrack.C6S1BR },
				{ name: 'Zero Build', value: RankedTrack.C6S1ZB },
				{ name: 'Reload (BR)', value: RankedTrack.UnknownReloadBR },
				{ name: 'Reload (ZB)', value: RankedTrack.UnknownReloadZB },
				{ name: 'Ballistic', value: RankedTrack.BallisticS0 },
				{ name: 'Rocket Racing', value: RankedTrack.Oct24Racing }
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
		const track = interaction.options.getString('mode', true) as RankedTrack.C6S1BR | RankedTrack.C6S1ZB | RankedTrack.UnknownReloadBR | RankedTrack.UnknownReloadZB | RankedTrack.Oct24Racing | RankedTrack.BallisticS0;

		if (!trackedModes.has(accountId)) trackedModes.set(accountId, { displayUsername: account.name, trackedModes: [] });
		const trackedUser = trackedModes.get(accountId);
		if (trackedUser === undefined) {
			await interaction.reply('An error occurred while getting the current mode to track.');
			console.error(`No tracked user found for account ${accountId}:`, trackedModes);
			return;
		}

		const trackDisplayName = {
			[RankedTrack.C6S1BR]: 'Battle Royale',
			[RankedTrack.C6S1ZB]: 'Zero Build',
			[RankedTrack.Oct24Racing]: 'Rocket Racing',
			[RankedTrack.UnknownReloadBR]: 'Reload (Battle Royale)',
			[RankedTrack.UnknownReloadZB]: 'Reload (Zero Build)',
			[RankedTrack.BallisticS0]: 'Ballistic'
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