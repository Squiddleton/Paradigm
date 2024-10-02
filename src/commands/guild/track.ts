import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, chatInputApplicationCommandMention } from 'discord.js';
import { DiscordIds, PlatformChoices, RankedTrack } from '../../util/constants.js';
import { trackedModes } from '../../util/epic.js';
import { getUser } from '../../util/users.js';
import { handleStatsError } from '../../util/fortnite.js';
import fortniteAPI from '../../clients/fortnite.js';
import type { AccountType, EpicAccount } from '@squiddleton/fortnite-api';

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
				{ name: 'Rocket Racing', value: RankedTrack.InfernoIslandRacing }
			]
		},
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
		}
	],
	scope: 'Exclusive',
	async execute(interaction) {
		const accountName = interaction.options.getString('player');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		let account: EpicAccount;
		if (accountName !== null) {
			try {
				const stats = await fortniteAPI.stats({ name: accountName, accountType });
				account = stats.account;
			}
			catch (error) {
				await handleStatsError(interaction, error, accountType);
				return;
			}
		}
		else {
			const userResult = getUser(interaction.user.id);
			if (!userResult?.epicAccountId) {
				await interaction.editReply(`No player username was provided, and you have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
				return;
			}
			account = { name: interaction.user.displayName, id: userResult.epicAccountId };
		}

		const accountId = account.id;
		const track = interaction.options.getString('mode', true) as RankedTrack.C5S4BR | RankedTrack.C5S4ZB | RankedTrack.InfernoIslandRacing | RankedTrack.Reload1BR | RankedTrack.Reload1ZB;

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
			[RankedTrack.InfernoIslandRacing]: 'Rocket Racing',
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