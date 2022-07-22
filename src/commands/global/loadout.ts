import { ApplicationCommandOptionType } from 'discord.js';
import { Scope, SlashCommand } from '../../types/types.js';
import { createLoadoutAttachment, createStyleListeners } from '../../util/fortnite.js';

export default new SlashCommand({
	name: 'loadout',
	description: 'Create an image of your Fortnite loadout',
	options: [
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
	scope: Scope.Global,
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

