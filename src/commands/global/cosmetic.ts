import { ApplicationCommandOptionType } from 'discord.js';
import { createCosmeticEmbed, findCosmetic } from '../../util/fortnite.js';
import { LanguageChoices, SlashCommand } from '../../types/types.js';
import FortniteAPI from '../../clients/fortnite.js';
import { Language } from '@squiddleton/fortnite-api';

export default new SlashCommand({
	name: 'cosmetic',
	description: 'Display info about any Fortnite cosmetic',
	options: [
		{
			name: 'cosmetic',
			type: ApplicationCommandOptionType.String,
			description: 'The name of the cosmetic',
			required: true,
			autocomplete: true
		},
		{
			name: 'language',
			description: 'The language for the returned cosmetic',
			type: ApplicationCommandOptionType.String,
			choices: LanguageChoices
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const item = findCosmetic(interaction.options.getString('cosmetic', true));
		const language = interaction.options.getString('language') as Language | null;

		if (item === null) {
			await interaction.editReply('No cosmetic matches your query.');
		}
		else {
			await interaction.editReply({ embeds: [createCosmeticEmbed(language === null ? item : await FortniteAPI.findCosmetic({ id: item.id, language }))] });
		}
	}
});