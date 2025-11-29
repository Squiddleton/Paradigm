import { SlashCommand } from '@squiddleton/discordjs-util';
import type { AccountType } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType, Colors, ContainerBuilder, MessageFlags, SectionBuilder, SeparatorBuilder, TextDisplayBuilder, type APIMessageTopLevelComponent, type JSONEncodable } from 'discord.js';
import { divisionNames, PlatformChoices, RankedEmojiIds, RankedTrackDisplayNames, RankingTypeChoices } from '../../util/constants.js';
import { getStats, isUnknownRank, linkEpicAccount } from '../../util/fortnite.js';
import { getRankedTracks, getTrackProgress } from '../../util/epic.js';
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
			name: 'all',
			description: 'Whether to include discontinued modes like OG and Getaway; defaults to false',
			type: ApplicationCommandOptionType.Boolean
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
		const includeDiscontinued = interaction.options.getBoolean('all') ?? false;

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

		let tracks = (await getRankedTracks()) ?? [];
		if (includeDiscontinued) {
			tracks = tracks.filter(track => {
				const choice = RankingTypeChoices.find(choice => choice.name === track.rankingType);
				return !choice?.discontinued;
			});
		}

		components.push(
			new TextDisplayBuilder().setContent(`# ${formatPossessive(stats.account.name)} Ranked History\nEpic Account ID: ${stats.account.id}`),
			new SeparatorBuilder()
		);

		for (const { name, value, discontinued } of RankingTypeChoices) {
			if (discontinued && !includeDiscontinued)
				continue; // Skip discontinued tracks

			const trackProgresses = progress.filter(p => p.rankingType === value);
			if (trackProgresses.length === 0 || trackProgresses.every(p => p.currentDivision === 0 && p.promotionProgress === 0))
				continue;

			let currentDivisionImage = 'unknown';

			trackProgresses.sort((a, b) => {
				const aBegin = new Date(tracks.find(track => track.trackguid === a.trackguid)?.beginTime ?? 0);
				const bBegin = new Date(tracks.find(track => track.trackguid === b.trackguid)?.beginTime ?? 0);
				return bBegin.getTime() - aBegin.getTime();
			});

			const section = new SectionBuilder();
			const text = new TextDisplayBuilder()
				.setContent(`## ${name}\n` + trackProgresses.map((track, i) => {
					const isUnknown = isUnknownRank(track);
					const emojiId = isUnknown ? RankedEmojiIds[0] : RankedEmojiIds[track.currentDivision + 1];
					const emoji = emojis.get(emojiId);
					if (emoji === undefined) throw new Error(`No emoji found for for division ${track.currentDivision}`);

					if (i === 0) { // First progress is of most recent ranked session
						currentDivisionImage = isUnknown
							? 'unknown'
							: divisionNames[track.currentDivision].toLowerCase().replace(' ', '');
					}
					else if (track.currentDivision === 0) {
						return null;
					}

					const seasonName = RankedTrackDisplayNames[track.trackguid] ?? 'Unknown Season';

					return `${seasonName}: ${(!isUnknown
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