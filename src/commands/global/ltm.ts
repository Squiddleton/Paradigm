import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { PlaylistAPI } from '../../types/fortniteapi.js';
import { Scope, SlashCommand } from '../../types/types.js';
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
	scope: Scope.Global,
	async execute(interaction) {
		await interaction.deferReply();

		const input = interaction.options.getString('ltm', true);
		const { data } = await fetch('https://fortnite-api.com/v1/playlists').then(response => response.json()) as PlaylistAPI;

		const ltm = data.find(mode => [mode.name, mode.id].some(keyword => noPunc(keyword) === noPunc(input)));
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
					{ name: 'Modes', value: [...new Set(data.filter(mode => mode.name === ltm.name).map(mode => mode.subName))].join('/') || 'N/A', inline: true },
					{ name: 'Added Date', value: new Date(ltm.added).toLocaleDateString(), inline: true }
				])
				.setFooter({ text: ltm.id, iconURL: ltm.images.missionIcon ?? undefined })
		] });
	}
});