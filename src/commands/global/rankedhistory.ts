import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType, Stats } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType, chatInputApplicationCommandMention, EmbedBuilder } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { DiscordIds, PlatformChoices, RankedEmojiIds, RankedTrack } from '../../util/constants.js';
import { handleStatsError, linkEpicAccount } from '../../util/fortnite.js';
import { getUser } from '../../util/users.js';
import { getTrackProgress } from '../../util/epic.js';
import type { HabaneroTrackProgress } from '@squiddleton/epic';

export default new SlashCommand({
	name: 'ranked-history',
	description: 'Display a Fortnite player\'s all-time Ranked stats',
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
		const user = interaction.options.getUser('user');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		let stats: Stats<false>;
		if (accountName !== null) {
			try {
				stats = await fortniteAPI.stats({ name: accountName, accountType });
			}
			catch (error) {
				await handleStatsError(interaction, error, accountType);
				return;
			}
		}
		else {
			const userResult = getUser(user?.id ?? interaction.user.id);
			if (!userResult?.epicAccountId) {
				if (user === null) {
					await interaction.editReply(`No player username was provided, and you have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
				}
				else {
					await interaction.editReply(`${user.displayName} has not linked their account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`);
				}
				return;
			}
			try {
				stats = await fortniteAPI.stats({ id: userResult.epicAccountId });
			}
			catch (error) {
				await handleStatsError(interaction, error);
				return;
			}
		}

		const progress = await getTrackProgress(stats.account.id);
		if (progress === null) {
			await interaction.editReply({ content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
			return;
		}

		const tracks: [string, RankedTrack | [RankedTrack, RankedTrack]][] = [
			['Season Zero Pre-Reset', [RankedTrack.S0PBR, RankedTrack.S0PZB]],
			['Season Zero', [RankedTrack.S0BR, RankedTrack.S0ZB]],
			['Chapter 4, Season 4', [RankedTrack.C4S4BR, RankedTrack.C4S4ZB]],
			['Fortnite: OG', [RankedTrack.OGBR, RankedTrack.OGZB]],
			['Chapter 5, Season 1', [RankedTrack.C5S1BR, RankedTrack.C5S1ZB]],
			['Chapter 5, Season 2', [RankedTrack.C5S2BR, RankedTrack.C5S2ZB]],
			['Chapter 5, Season 3', [RankedTrack.C5S3BR, RankedTrack.C5S3ZB]],
			['Chapter 5, Season 4', [RankedTrack.C5S4BR, RankedTrack.C5S4ZB]],
			['Reload Season Zero', [RankedTrack.Reload1BR, RankedTrack.Reload1ZB]],
			['Rocket Racing Season Zero', RankedTrack.S0Racing],
			['Neon Rush Racing', RankedTrack.NeonRushRacing],
			['Inferno Island Racing', RankedTrack.InfernoIslandRacing],
			['Rocket Racing Chapter 5, Season 4', RankedTrack.C5S4Racing]
		];

		const app = await interaction.client.application.fetch();
		const emojis = await app.emojis.fetch();

		const embed = new EmbedBuilder()
			.setTitle(`Ranked History: ${stats.account.name}`)
			.setFields(tracks.map(([name, trackId]) => {
				const isUnknown = (progress: HabaneroTrackProgress) => progress.currentDivision === 0 && progress.promotionProgress === 0 && new Date(progress.lastUpdated).getTime() === 0;

				const getEmoji = (trackguid: RankedTrack) => {
					const track = progress.find(p => p.trackguid === trackguid);
					if (track === undefined) throw new Error(`No track progress found for track guid ${trackguid}`);

					const emojiId = isUnknown(track) ? RankedEmojiIds[0] : RankedEmojiIds[track.currentDivision + 1];
					const emoji = emojis.get(emojiId);
					if (emoji === undefined) throw new Error(`No emoji found for for division ${track.currentDivision}`);

					return emoji;
				};

				return {
					name,
					value: Array.isArray(trackId)
						? `${getEmoji(trackId[0])} BR ${getEmoji(trackId[1])} ZB`
						: getEmoji(trackId).toString(),
					inline: true
				};
			}));

		await interaction.editReply({ embeds: [embed] });

		if (interaction.options.getBoolean('link')) await linkEpicAccount(interaction, stats.account);
	}
});