import imgurClient from '../../clients/imgur.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { randomFromArray } from '../../util/functions.js';
import { BorisAlbumIds } from '../../util/constants.js';

const data: string[] = (await Promise.all(BorisAlbumIds.map(album => imgurClient.Album.get(album))))
	.map(album => album.data.images)
	.flat()
	.map(image => image.link);

export default new SlashCommand({
	name: 'boris',
	description: 'Send an image of the goodest boy',
	scope: 'Global',
	async execute(interaction) {
		await interaction.reply({ files: [randomFromArray(data)] });
	}
});