import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType, Colors, ContainerBuilder, MessageFlags, SectionBuilder, SeparatorBuilder, TextDisplayBuilder, type APIMessageTopLevelComponent, type JSONEncodable } from 'discord.js';
import { divisionNames, PlatformChoices, RankedEmojiIds, RankedTrack, RankingTypeChoices } from '../../util/constants.js';
import { getStats, isUnknownRank, linkEpicAccount } from '../../util/fortnite.js';
import { getTrackProgress } from '../../util/epic.js';
import { formatPossessive } from '@squiddleton/util';

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
			name: 'hide',
			description: 'Whether to hide the command reply so only you can see it; default to false',
			type: ApplicationCommandOptionType.Boolean
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
		await interaction.deferReply({ flags: interaction.options.getBoolean('hide') ? MessageFlags.Ephemeral : undefined });

		const accountName = interaction.options.getString('player');
		const user = interaction.options.getUser('user');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as AccountType;

		const stats = await getStats(interaction, accountName, accountType, user);
		if (stats === null) return;

		const progress = await getTrackProgress(stats.account.id);
		if (progress === null) {
			await interaction.editReply({ content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
			return;
		}

		const app = await interaction.client.application.fetch();
		const emojis = await app.emojis.fetch();
		const components: JSONEncodable<APIMessageTopLevelComponent>[] = [];
		const imageNames: string[] = [];

		const tracks: [string, string | [string, string]][] = [
			['Season Zero Pre-Reset', [RankedTrack.S0PBR, RankedTrack.S0PZB]],
			['Season Zero', [RankedTrack.S0BR, RankedTrack.S0ZB]],
			['Chapter 4, Season 4', [RankedTrack.C4S4BR, RankedTrack.C4S4ZB]],
			['Fortnite: OG', [RankedTrack.OGBR, RankedTrack.OGZB]],
			['Chapter 5, Season 1', [RankedTrack.C5S1BR, RankedTrack.C5S1ZB]],
			['Chapter 5, Season 2', [RankedTrack.C5S2BR, RankedTrack.C5S2ZB]],
			['Chapter 5, Season 3', [RankedTrack.C5S3BR, RankedTrack.C5S3ZB]],
			['Chapter 5, Season 4', [RankedTrack.C5S4BR, RankedTrack.C5S4ZB]],
			['Fortnite: Remix', [RankedTrack.RemixBR, RankedTrack.RemixZB]],
			['Chapter 6, Season 1', [RankedTrack.C6S1BR, RankedTrack.C6S1ZB]],
			['Chapter 6, Season 2', [RankedTrack.C6S2BR, RankedTrack.C6S2ZB]],
			['Galactic Batttle', [RankedTrack.GalacticBattleBR, RankedTrack.GalacticBattleZB]],
			['Chapter 6, Season 3', [RankedTrack.C6S3BR, RankedTrack.C6S3ZB]],
			['Reload Season Zero', [RankedTrack.S0ReloadBR, RankedTrack.S0ReloadZB]],
			['Reload Remix', [RankedTrack.RemixReloadBR, RankedTrack.RemixReloadZB]],
			['Reload Season 2', [RankedTrack.S2ReloadBR, RankedTrack.S2ReloadZB]],
			['Reload Season 3', [RankedTrack.S3ReloadBR, RankedTrack.S3ReloadZB]],
			['Rocket Racing Season Zero', RankedTrack.S0Racing],
			['Rocket Racing Neon Rush', RankedTrack.NeonRushRacing],
			['Rocket Racing Inferno Island', RankedTrack.InfernoIslandRacing],
			['Rocket Racing October 2024', RankedTrack.Oct24Racing],
			['Rocket Racing December 2024', RankedTrack.Dec24Racing],
			['Rocket Racing February 2025', RankedTrack.Feb25Racing],
			['Rocket Racing May 2025', RankedTrack.May25Racing],
			['Rocket Racing June 2025', RankedTrack.June25Racing],
			['Fortnite OG Season Zero', [RankedTrack.OGS0BR, RankedTrack.OGS0ZB]],
			['Fortnite OG Season 2', [RankedTrack.OGS2BR, RankedTrack.OGS2ZB]],
			['Fortnite OG Season 3', [RankedTrack.OGS3BR, RankedTrack.OGS3ZB]],
			['Ballistic Season Zero', RankedTrack.BallisticS0],
			['Ballistic R&D Season 1', RankedTrack.BallisticRAndDS1],
			['Ballistic R&D Season 2', RankedTrack.BallisticRAndDS2],
			['Getaway', [RankedTrack.GetawayBR, RankedTrack.GetawayZB]]
		];

		components.push(
			new TextDisplayBuilder().setContent(`# ${formatPossessive(stats.account.name)} Ranked History\nEpic Account ID: ${stats.account.id}`),
			new SeparatorBuilder()
		);

		for (const { name, value } of RankingTypeChoices) {
			const trackProgresses = progress.filter(p => p.rankingType === value);
			if (trackProgresses.length === 0 || trackProgresses.every(p => p.currentDivision === 0 && p.promotionProgress === 0))
				continue;

			let currentDivisionImage = 'unknown';

			trackProgresses.sort((a, b) => tracks.findIndex(t => t[1].includes(a.trackguid)) - tracks.findIndex(t => t[1].includes(b.trackguid)));

			const section = new SectionBuilder();
			const text = new TextDisplayBuilder()
				.setContent(`## ${name}\n` + trackProgresses.map((track, i) => {
					const isUnknown = isUnknownRank(track);
					const emojiId = isUnknown ? RankedEmojiIds[0] : RankedEmojiIds[track.currentDivision + 1];
					const emoji = emojis.get(emojiId);
					if (emoji === undefined) throw new Error(`No emoji found for for division ${track.currentDivision}`);

					if (i === trackProgresses.length - 1) { // Last progress is of most recent ranked session
						currentDivisionImage = isUnknown
							? 'unknown'
							: divisionNames[track.currentDivision].toLowerCase().replace(' ', '');
					}
					else if (track.currentDivision === 0) {
						return null;
					}

					const seasonName = tracks.find(t => t[1] === track.trackguid || t[1].includes(track.trackguid));

					return `${seasonName?.[0] ?? 'Unknown Season'}: ${(!isUnknown
						? `${emoji} ${track.currentPlayerRanking === null ? `${Math.round(track.promotionProgress * 100)}%` : `#${track.currentPlayerRanking}`}`
						: emoji.toString())}`;
				}).filter(content => content !== null).join('\n'));

			if (!imageNames.includes(currentDivisionImage))
				imageNames.push(currentDivisionImage);

			const colors = [
				{ div: 'bronze', color: Colors.Orange },
				{ div: 'silver', color: Colors.DarkerGrey },
				{ div: 'gold', color: Colors.Gold },
				{ div: 'platinum', color: Colors.LightGrey },
				{ div: 'diamond', color: Colors.Blurple },
				{ div: 'elite', color: Colors.DarkButNotBlack },
				{ div: 'champion', color: Colors.Red },
				{ div: 'unreal', color: Colors.Purple }
			];

			section
				.addTextDisplayComponents(text)
				.setThumbnailAccessory(thumbnail => thumbnail.setURL(`attachment://${currentDivisionImage}.png`));

			const container = new ContainerBuilder()
				.addSectionComponents(section)
				.setAccentColor(colors.find(arr => currentDivisionImage.includes(arr.div))?.color ?? Colors.Blue);

			components.push(container);
		}

		await interaction.editReply({ components, files: imageNames.map(image => `./assets/ranked/${image}.png`), flags: MessageFlags.IsComponentsV2 });

		if (interaction.options.getBoolean('link')) await linkEpicAccount(interaction, stats.account);
	}
});