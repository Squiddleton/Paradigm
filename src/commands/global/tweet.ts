import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { LoadoutImageOptions } from '../../util/constants.js';
import { createLoadoutAttachment, createStyleListeners } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'tweet',
	description: 'Create a fake Tweet of your Fortnite locker bundle',
	options: [
		{
			name: 'text',
			description: 'The text to include in the Tweet',
			type: ApplicationCommandOptionType.String
		},
		...LoadoutImageOptions
	],
	scope: 'Global',
	async execute(interaction) {
		const text = interaction.options.getString('text');
		const outfit = interaction.options.getString('outfit');
		const backbling = interaction.options.getString('backbling');
		const pickaxe = interaction.options.getString('pickaxe');
		const glider = interaction.options.getString('glider');
		const wrap = interaction.options.getString('wrap');
		const chosenBackground = interaction.options.getString('background');

		await interaction.deferReply();

		const attachment = await createLoadoutAttachment(outfit, backbling, pickaxe, glider, wrap, chosenBackground);
		if (typeof attachment === 'string') {
			await interaction.editReply(attachment);
			return;
		}

		const embed = new EmbedBuilder()
			.setAuthor({ name: 'Fortnite (@FortniteGame)', iconURL: 'https://pbs.twimg.com/profile_images/1599314555481587713/ti619evb_400x400.jpg' })
			.setDescription(text?.slice(0, 4000) ?? `Grab the @${interaction.inCachedGuild() ? interaction.member.displayName : interaction.user.username} locker bundle for a limited time!`)
			.setFields([
				{ name: 'Retweets', value: '498', inline: true },
				{ name: 'Likes', value: '12025', inline: true }
			])
			.setImage('attachment://loadout.png')
			.setColor(0x29a8df)
			.setFooter({ text: 'Twitter', iconURL: 'https://www.stickee.co.uk/wp-content/uploads/2017/02/twitter-logo-2-500x500.png' });

		await createStyleListeners(interaction, attachment, outfit, backbling, pickaxe, glider, wrap, chosenBackground, [embed]);
	}
});

