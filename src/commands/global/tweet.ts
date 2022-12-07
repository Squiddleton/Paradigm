import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType } from 'discord.js';
import readOnlyClient from '../../clients/twitter.js';
import { TimestampedEmbed } from '../../util/classes.js';
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
		const harvestingtool = interaction.options.getString('harvestingtool');
		const glider = interaction.options.getString('glider');
		const wrap = interaction.options.getString('wrap');
		const chosenBackground = interaction.options.getString('background');

		await interaction.deferReply();

		const attachment = await createLoadoutAttachment(outfit, backbling, harvestingtool, glider, wrap, chosenBackground);
		if (typeof attachment === 'string') {
			await interaction.editReply(attachment);
			return;
		}

		const twitterUser = await readOnlyClient.v1.user({ screen_name: 'FortniteGame' });

		const embed = new TimestampedEmbed()
			.setAuthor({ name: 'Fortnite (@FortniteGame)', iconURL: twitterUser.profile_image_url_https })
			.setDescription(text === null ? `Grab the @${interaction.inCachedGuild() ? interaction.member.displayName : interaction.user.username} locker bundle for a limited time!` : `${text.slice(0, 4000)}`)
			.setFields([
				{ name: 'Retweets', value: '498', inline: true },
				{ name: 'Likes', value: '12025', inline: true }
			])
			.setImage('attachment://loadout.png')
			.setColor(0x29a8df)
			.setFooter({ text: 'Twitter', iconURL: 'https://www.stickee.co.uk/wp-content/uploads/2017/02/twitter-logo-2-500x500.png' });

		await createStyleListeners(interaction, attachment, outfit, backbling, harvestingtool, glider, wrap, chosenBackground, [embed]);
	}
});

