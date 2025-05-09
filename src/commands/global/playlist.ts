import { SlashCommand } from '@squiddleton/discordjs-util';
import { FortniteAPIError, type Playlist } from '@squiddleton/fortnite-api';
import { normalize, removeDuplicates } from '@squiddleton/util';
import { ApplicationCommandOptionType, EmbedBuilder, MessageFlags } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';

export default new SlashCommand({
	name: 'playlist',
	description: 'Display info about a Fortnite playlist',
	options: [
		{
			name: 'playlist',
			description: 'The playlist\'s name',
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true
		}
	],
	scope: 'Global',
	async execute(interaction) {
		let playlists: Playlist[];
		try {
			playlists = await fortniteAPI.playlists();
		}
		catch (error) {
			if (error instanceof FortniteAPIError && error.code === 503) {
				await interaction.reply({ content: 'Fortnite-API is currently booting up. Please try again in a few minutes.', flags: MessageFlags.Ephemeral });
				return;
			}
			throw error;
		}

		await interaction.deferReply();

		const input = interaction.options.getString('playlist', true);

		const playlist = playlists.find(p => [p.name, p.id].some(keyword => keyword !== undefined && normalize(keyword) === normalize(input)));
		if (playlist === undefined) {
			await interaction.editReply('No playlist matches your query.');
			return;
		}

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle(playlist.name ?? 'Unnamed Playlist')
					.setDescription(playlist.description?.replaceAll('\\n', '\n').replaceAll('\\r', '\r') ?? 'No description.')
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					.setImage(playlist.images?.showcase ?? null)
					.setFields([
						{ name: 'Modes', value: removeDuplicates(playlists.filter(p => p.name === playlist.name).map(p => p.subName)).join('/') || 'N/A', inline: true },
						{ name: 'Added Date', value: new Date(playlist.added).toLocaleDateString(), inline: true }
					])
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					.setFooter({ text: playlist.id, iconURL: playlist.images?.missionIcon ?? undefined })
			]
		});
	}
});