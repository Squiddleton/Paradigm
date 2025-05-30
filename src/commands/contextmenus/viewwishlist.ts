import { ContextMenu } from '@squiddleton/discordjs-util';
import { ApplicationCommandType, MessageFlags } from 'discord.js';
import { viewWishlist } from '../../util/fortnite.js';

export default new ContextMenu({
	name: 'View Wishlist',
	type: ApplicationCommandType.User,
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		await viewWishlist(interaction);
	}
});