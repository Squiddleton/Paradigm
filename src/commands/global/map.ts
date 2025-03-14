import { SlashCommand } from '@squiddleton/discordjs-util';
import { FortniteAPIError, type FortniteMap } from '@squiddleton/fortnite-api';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';

export default new SlashCommand({
	name: 'map',
	description: 'Display info about the current Fortnite island',
	scope: 'Global',
	async execute(interaction) {
		let map: FortniteMap;
		try {
			map = await fortniteAPI.map();
		}
		catch (error) {
			if (error instanceof FortniteAPIError && error.code === 503) {
				await interaction.reply({ content: 'Fortnite-API is currently booting up. Please try again in a few minutes.', flags: MessageFlags.Ephemeral });
				return;
			}
			throw error;
		}

		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle('Helios')
					.setImage(map.images.pois)
					.setFields([
						{ name: 'Named POIs', value: map.pois.filter(p => !p.id.includes('UnNamedPOI')).length.toString(), inline: true },
						{ name: 'Landmarks', value: map.pois.filter(p => p.id.includes('UnNamedPOI')).length.toString(), inline: true }
					])
					.setColor('Blue')
			]
		});
	}
});