import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import FortniteAPI from '../../clients/fortnite.js';
import { SlashCommand } from '../../types/types.js';
import { noPunc } from '../../util/functions.js';

export default new SlashCommand({
	name: 'ltm',
	description: 'Display info about a Fortnite limited-time mode',
	options: [
		{
			name: 'ltm',
			description: 'The name of the LTM',
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const input = interaction.options.getString('ltm', true);
		const playlists = await FortniteAPI.playlists();

		const ltm = playlists.find(mode => [mode.name, mode.id].some(keyword => noPunc(keyword) === noPunc(input)));
		if (ltm === undefined) {
			await interaction.editReply('No LTM matches your query.');
			return;
		}

		await interaction.editReply({ embeds: [
			new EmbedBuilder()
				.setTitle(ltm.name)
				.setDescription(ltm.description?.replaceAll('\\n', '\n').replaceAll('\\r', '\r') ?? 'No description.')
				.setImage(ltm.images.showcase)
				.setFields([
					{ name: 'Modes', value: [...new Set(playlists.filter(mode => mode.name === ltm.name).map(mode => mode.subName))].join('/') || 'N/A', inline: true },
					{ name: 'Added Date', value: new Date(ltm.added).toLocaleDateString(), inline: true }
				])
				.setFooter({ text: ltm.id, iconURL: ltm.images.missionIcon ?? undefined })
		] });
	}
});