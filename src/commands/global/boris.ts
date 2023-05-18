import { SlashCommand } from '@squiddleton/discordjs-util';
import { getRandomItem } from '@squiddleton/util';
import imgurClient from '../../clients/imgur.js';
import { BorisAlbumIds } from '../../util/constants.js';

export default new SlashCommand({
	name: 'boris',
	description: 'Send an image of the goodest boy',
	scope: 'Global',
	async execute(interaction) {
		try {
			const data: string[] = (await Promise.all(BorisAlbumIds.map(a => imgurClient.Album.get(a))))
				.map(a => a.data.images)
				.flat()
				.map(i => i.link);

			await interaction.reply({ files: [getRandomItem(data)] });
		}
		catch (e) {
			if (typeof e === 'object' && !(e instanceof Error) && e !== null && 'status' in e && e.status === 429) await interaction.reply({ content: 'Imgur is temporarily over capacity for fetching images; please try again later.', ephemeral: true });
			else throw e;
		}
	}
});