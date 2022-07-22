import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { MapAPI } from '../../types/fortniteapi.js';
import { SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'map',
	description: 'Display info on the current Fortnite island',
	async execute(interaction) {
		const { data } = await fetch('https://fortnite-api.com/v1/map').then(response => response.json()) as MapAPI;

		await interaction.reply({ embeds: [
			new EmbedBuilder()
				.setTitle('Artemis')
				.setImage(data.images.pois)
				.setFields([
					{ name: 'Named POIs', value: data.pois.filter(poi => !poi.id.includes('UnNamedPOI')).length.toString(), inline: true },
					{ name: 'Landmarks', value: data.pois.filter(poi => poi.id.includes('UnNamedPOI')).length.toString(), inline: true }
				])
				.setColor('Blue')
		] });
	}
});