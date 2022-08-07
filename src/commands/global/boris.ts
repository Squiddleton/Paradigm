import imgurClient from '../../clients/imgur.js';
import { SlashCommand } from '../../types/types.js';
import { randomFromArray } from '../../util/functions.js';

const data = (await Promise.all(['l5t1sa4', 'Mwq1cMR', 'SIDS0Rx', 'h9QexoV', '1duqrpv', 'iLt9Ija'].map(album => imgurClient.Album.get(album)))).map(album => album.data.images).flat();

export default new SlashCommand({
	name: 'boris',
	description: 'Send an image of the goodest boy',
	scope: 'Global',
	async execute(interaction) {
		await interaction.reply({ files: [randomFromArray(data.map(image => image.link) as string[])] });
	}
});