import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import { SlashCommand } from '../../types/types.js';
import { createLoadoutAttachment, createStyleListeners } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'tweet',
	description: 'Create a fake Tweet of your Fortnite locker bundle',
	options: [
		{
			name: 'text',
			type: ApplicationCommandOptionType.String,
			description: 'The text to include in the Tweet'
		},
		{
			name: 'outfit',
			type: ApplicationCommandOptionType.String,
			description: 'Any outfit in the game\'s files',
			autocomplete: true
		},
		{
			name: 'backbling',
			type: ApplicationCommandOptionType.String,
			description: 'Any back bling in the game\'s files',
			autocomplete: true
		},
		{
			name: 'harvestingtool',
			type: ApplicationCommandOptionType.String,
			description: 'Any harvesting tool in the game\'s files',
			autocomplete: true
		},
		{
			name: 'glider',
			type: ApplicationCommandOptionType.String,
			description: 'Any glider in the game\'s files',
			autocomplete: true
		},
		{
			name: 'wrap',
			type: ApplicationCommandOptionType.String,
			description: 'Any wrap in the game\'s files',
			autocomplete: true
		},
		{
			name: 'background',
			type: ApplicationCommandOptionType.String,
			description: 'Select a specific background color',
			choices: [
				{ name: 'Gold', value: 'gold' },
				{ name: 'Orange', value: 'orange' },
				{ name: 'Purple', value: 'purple' },
				{ name: 'Blue', value: 'blue' },
				{ name: 'Green', value: 'green' }
			]
		}
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

		const embed = new EmbedBuilder()
			.setAuthor({ name: 'Fortnite (@FortniteGame)', iconURL: 'https://pbs.twimg.com/profile_images/1371468883136286727/5TuH8hHa_400x400.jpg' })
			.setDescription(text === null ? `Grab the @${interaction.inCachedGuild() ? interaction.member.displayName : interaction.user.username} locker bundle for a limited time!` : `${text.slice(0, 4000)}`)
			.addFields([
				{ name: 'Retweets', value: '498', inline: true },
				{ name: 'Likes', value: '12025', inline: true }
			])
			.setImage('attachment://loadout.png')
			.setColor(0x29a8df)
			.setFooter({ text: 'Twitter', iconURL: 'https://www.stickee.co.uk/wp-content/uploads/2017/02/twitter-logo-2-500x500.png' })
			.setTimestamp();

		await createStyleListeners(interaction, attachment, outfit, backbling, harvestingtool, glider, wrap, chosenBackground, [embed]);
	}
});

