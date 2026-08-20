import { SlashCommand } from '@squiddleton/discordjs-util';
import { getSprites } from '../../util/fortnite.js';
import { MessageFlags } from 'discord.js';

export default new SlashCommand({
	name: 'sprites',
	description: 'View and update your Sprite collection',
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();
		const components = getSprites(interaction.client, interaction.user.id, (interaction.inCachedGuild() ? interaction.member : interaction.user).displayName);
		await interaction.editReply({ components, flags: MessageFlags.IsComponentsV2 });
	}
});