import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType } from 'discord.js';
import { viewWishlist } from '../../util/fortnite';

export default new ContextMenu({
	name: 'View Wishlist',
	type: ApplicationCommandType.User,
	scope: 'Global',
	async execute(interaction) {
		await viewWishlist(interaction);
	}
});