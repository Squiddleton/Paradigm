import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, chatInputApplicationCommandMention } from 'discord.js';
import { DiscordIds, RankedTrack } from '../../util/constants.js';
import { trackedModes } from '../../util/epic.js';
import { getUser } from '../../util/users.js';

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
				{ name: 'Battle Royale', value: RankedTrack.C5S1BR },
				{ name: 'Zero Build', value: RankedTrack.C5S1ZB },
				{ name: 'Rocket Racing', value: RankedTrack.S0Racing }
			]
		}
	],
	scope: 'Exclusive',
	async execute(interaction) {
		const userResult = getUser(interaction.user.id);
		if (userResult === null || userResult.epicAccountId === null) {
			await interaction.reply({ content: `You have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`, ephemeral: true });
			return;
		}

		const track = interaction.options.getString('mode', true) as RankedTrack.C5S1BR | RankedTrack.C5S1ZB | RankedTrack.S0Racing;

		if (!trackedModes.has(userResult.epicAccountId)) trackedModes.set(userResult.epicAccountId, { displayUsername: interaction.user.displayName, trackedModes: [] });
		const trackedUser = trackedModes.get(userResult.epicAccountId)!;

		const trackDisplayName = {
			[RankedTrack.C5S1BR]: 'Battle Royale',
			[RankedTrack.C5S1ZB]: 'Zero Build',
			[RankedTrack.S0Racing]: 'Rocket Racing'
		}[track];
		const existingTrack = trackedUser.trackedModes.find(t => t.trackguid === track);

		if (existingTrack === undefined) {
			trackedUser.trackedModes.push({ trackguid: track, displayName: trackDisplayName });
			await interaction.reply(`Started tracking your progress in ${trackDisplayName}!`);
		}
		else {
			trackedUser.trackedModes.splice(trackedUser.trackedModes.indexOf(existingTrack), 1);
			await interaction.reply(`Stopped tracking your progress in ${trackDisplayName}.`);
		}
	}
});

