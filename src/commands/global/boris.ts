import { SlashCommand } from '@squiddleton/discordjs-util';
import { getRandomItem } from '@squiddleton/util';
import imgurClient from '../../clients/imgur.js';
import { BorisAlbumIds } from '../../util/constants.js';

export default new SlashCommand({
	name: 'boris',
	description: 'Send an image of the goodest boy',
	scope: 'Global',
	async execute(interaction) {
		const data: string[] = (await Promise.all(BorisAlbumIds.map(album => imgurClient.Album.get(album))))
			.map(album => album.data.images)
			.flat()
			.map(image => image.link);

		await interaction.reply({ files: [getRandomItem(data)] });
	}
});