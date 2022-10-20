import { SlashCommand } from '@squiddleton/discordjs-util';
import { createLoadoutAttachment, createStyleListeners } from '../../util/fortnite.js';
import { LoadoutImageOptions } from '../../util/constants.js';

export default new SlashCommand({
	name: 'loadout',
	description: 'Create an image of your Fortnite loadout',
	options: LoadoutImageOptions,
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

		if (typeof attachment === 'string') {
			await interaction.editReply(attachment);
			return;
		}

		return createStyleListeners(interaction, attachment, outfit, backbling, harvestingtool, glider, wrap, chosenBackground, []);
	}
});

