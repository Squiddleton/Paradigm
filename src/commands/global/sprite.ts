import { SlashCommand } from '@squiddleton/discordjs-util';
import { compareSprites, getSprites } from '../../util/fortnite.js';
import { ApplicationCommandOptionType, MessageFlags } from 'discord.js';

export default new SlashCommand({
	name: 'sprite',
	description: 'Various commands involving your Sprite collection',
	options: [
		{
			name: 'list',
			description: 'View and update your Sprite collection',
			type: ApplicationCommandOptionType.Subcommand
		},
		{
			name: 'compare',
			description: 'Compare your Sprite collection with another user to see who has what the other\'s missing',
			type: ApplicationCommandOptionType.Subcommand,
			options: [{
				name: 'user',
				description: 'The user to compare Sprites with',
				type: ApplicationCommandOptionType.User,
				required: true
			}]
		}
	],
	scope: 'Global',
	async execute(interaction) {
		const username = (interaction.inCachedGuild() ? interaction.member : interaction.user).displayName;

		switch (interaction.options.getSubcommand()) {
			case 'list': {
				await interaction.deferReply();
				const components = getSprites(interaction.client, interaction.user.id, username);
				await interaction.editReply({ components, flags: MessageFlags.IsComponentsV2 });
				break;
			}
			case 'compare': {
				await interaction.deferReply();
				const targetUser = interaction.options.getUser('user', true);
				const targetMember = interaction.inCachedGuild() ? interaction.options.getMember('user') : null;
				const container = compareSprites(interaction.client, interaction.user.id, username, targetUser.id, targetMember?.displayName ?? targetUser.displayName);
				await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
				break;
			}
		}
	}
});