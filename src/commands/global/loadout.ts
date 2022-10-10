import { ApplicationCommandOptionType } from 'discord.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { createLoadoutAttachment, createStyleListeners } from '../../util/fortnite.js';
import { BackgroundChoices } from '../../constants.js';

export default new SlashCommand({
	name: 'loadout',
	description: 'Create an image of your Fortnite loadout',
	options: [
		{
			name: 'outfit',
			description: 'Any outfit in the game\'s files',
			type: ApplicationCommandOptionType.String,
			autocomplete: true
		},
		{
			name: 'backbling',
			description: 'Any back bling in the game\'s files',
			type: ApplicationCommandOptionType.String,
			autocomplete: true
		},
		{
			name: 'harvestingtool',
			description: 'Any harvesting tool in the game\'s files',
			type: ApplicationCommandOptionType.String,
			autocomplete: true
		},
		{
			name: 'glider',
			description: 'Any glider in the game\'s files',
			type: ApplicationCommandOptionType.String,
			autocomplete: true
		},
		{
			name: 'wrap',
			description: 'Any wrap in the game\'s files',
			type: ApplicationCommandOptionType.String,
			autocomplete: true
		},
		{
			name: 'background',
			description: 'Select a specific background color',
			type: ApplicationCommandOptionType.String,
			choices: BackgroundChoices
		}
	],
	scope: 'Global',
	async execute(interaction) {
		const outfit = interaction.options.getString('outfit');
		const backbling = interaction.options.getString('backbling');
		const harvestingtool = interaction.options.getString('harvestingtool');
		const glider = interaction.options.getString('glider');
		const wrap = interaction.options.getString('wrap');
		const chosenBackground = interaction.options.getString('background');

		if (!outfit && !backbling && !harvestingtool && !glider && !wrap) {
			await interaction.reply({ content: 'You must include at least one cosmetic.', ephemeral: true });
			return;
		}
		await interaction.deferReply();
		const attachment = await createLoadoutAttachment(outfit, backbling, harvestingtool, glider, wrap, chosenBackground);
		const isError = typeof attachment === 'string';
		if (isError) {
			await interaction.editReply(attachment);
			return;
		}

		return createStyleListeners(interaction, attachment, outfit, backbling, harvestingtool, glider, wrap, chosenBackground, []);
	}
});

