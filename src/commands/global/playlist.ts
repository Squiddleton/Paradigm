import { SlashCommand } from '@squiddleton/discordjs-util';
import { normalize, removeDuplicates } from '@squiddleton/util';
import { ApplicationCommandOptionType } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { TimestampedEmbed } from '../../util/classes.js';

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
		await interaction.deferReply();

		const input = interaction.options.getString('playlist', true);
		const playlists = await fortniteAPI.playlists();

		const playlist = playlists.find(mode => [mode.name, mode.id].some(keyword => normalize(keyword) === normalize(input)));
		if (playlist === undefined) {
			await interaction.editReply('No playlist matches your query.');
			return;
		}

		await interaction.editReply({
			embeds: [
				new TimestampedEmbed()
					.setTitle(playlist.name)
					.setDescription(playlist.description?.replaceAll('\\n', '\n').replaceAll('\\r', '\r') ?? 'No description.')
					.setImage(playlist.images.showcase)
					.setFields([
						{ name: 'Modes', value: removeDuplicates(playlists.filter(mode => mode.name === playlist.name).map(mode => mode.subName)).join('/') || 'N/A', inline: true },
						{ name: 'Added Date', value: new Date(playlist.added).toLocaleDateString(), inline: true }
					])
					.setFooter({ text: playlist.id, iconURL: playlist.images.missionIcon ?? undefined })
			]
		});
	}
});