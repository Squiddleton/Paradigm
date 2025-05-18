import { SlashCommand } from '@squiddleton/discordjs-util';
import { createShopImage } from '../../util/fortnite.js';
import { ApplicationCommandOptionType, chatInputApplicationCommandMention } from 'discord.js';
import { DiscordIds } from '../../util/constants.js';
import guildModel from '../../models/guilds.js';

export default new SlashCommand({
	name: 'shop',
	description: 'View an image of the current Fortnite item shop',
	options: [
		{
			name: 'quality',
			description: 'The visual quality of the image generated; defaults to Normal',
			type: ApplicationCommandOptionType.Integer,
			choices: [
				{
					name: 'Low',
					value: 128
				},
				{
					name: 'Normal',
					value: 256
				},
				{
					name: 'High',
					value: 512
				}
			]
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.reply('Generating shop image...');
		const image = await createShopImage(interaction.options.getInteger('quality') ?? undefined);
		let content = null;
		if (interaction.inCachedGuild()) {
			const guildDocument = await guildModel.findById(interaction.guildId);
			if (!guildDocument?.shopChannelId)
				content = `Want the bot to automatically post the shop when it refreshes? Have a server moderator use ${chatInputApplicationCommandMention('settings', 'edit', DiscordIds.CommandId.Settings)}!`;
		}
		await interaction.editReply({ content, files: [image] });
	}
});