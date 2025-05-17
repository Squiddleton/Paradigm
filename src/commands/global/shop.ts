import { SlashCommand } from '@squiddleton/discordjs-util';
import { createShopImage } from '../../util/fortnite.js';
import { chatInputApplicationCommandMention } from 'discord.js';
import { DiscordIds } from '../../util/constants.js';
import guildModel from '../../models/guilds.js';

export default new SlashCommand({
	name: 'shop',
	description: 'View an image of the current Fortnite item shop',
	scope: 'Global',
	async execute(interaction) {
		await interaction.reply('Generating shop image...');
		const image = await createShopImage();
		let content = null;
		if (interaction.inCachedGuild()) {
			const guildDocument = await guildModel.findById(interaction.guildId);
			if (!guildDocument?.shopChannelId)
				content = `Want the bot to automatically post the shop when it refreshes? Have a server moderator use ${chatInputApplicationCommandMention('settings', 'edit', DiscordIds.CommandId.Settings)}!`;
		}
		await interaction.editReply({ content, files: [image] });
	}
});