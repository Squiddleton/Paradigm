import { SlashCommand } from '@squiddleton/discordjs-util';
import fortniteAPI from '../../clients/fortnite.js';
import { TimestampedEmbed } from '../../util/classes.js';

export default new SlashCommand({
	name: 'map',
	description: 'Display info about the current Fortnite island',
	scope: 'Global',
	async execute(interaction) {
		const map = await fortniteAPI.map();

		await interaction.reply({
			embeds: [
				new TimestampedEmbed()
					.setTitle('Artemis')
					.setImage(map.images.pois)
					.setFields([
						{ name: 'Named POIs', value: map.pois.filter(poi => !poi.id.includes('UnNamedPOI')).length.toString(), inline: true },
						{ name: 'Landmarks', value: map.pois.filter(poi => poi.id.includes('UnNamedPOI')).length.toString(), inline: true }
					])
					.setColor('Blue')
			]
		});
	}
});