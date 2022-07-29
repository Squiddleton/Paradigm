import { EmbedBuilder } from 'discord.js';
import FortniteAPI from '../../clients/fortnite.js';
import { Scope, SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'map',
	description: 'Display info about the current Fortnite island',
	scope: Scope.Global,
	async execute(interaction) {
		const map = await FortniteAPI.map();

		await interaction.reply({ embeds: [
			new EmbedBuilder()
				.setTitle('Artemis')
				.setImage(map.images.pois)
				.setFields([
					{ name: 'Named POIs', value: map.pois.filter(poi => !poi.id.includes('UnNamedPOI')).length.toString(), inline: true },
					{ name: 'Landmarks', value: map.pois.filter(poi => poi.id.includes('UnNamedPOI')).length.toString(), inline: true }
				])
				.setColor('Blue')
		] });
	}
});