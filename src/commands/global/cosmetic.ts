import { ApplicationCommandOptionType } from 'discord.js';
import type { Language } from '@squiddleton/fortnite-api';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { createCosmeticEmbed, findCosmetic } from '../../util/fortnite.js';
import { LanguageChoices } from '../../util/constants.js';
import fortniteAPI from '../../clients/fortnite.js';

export default new SlashCommand({
	name: 'cosmetic',
	description: 'Display info about any Fortnite cosmetic',
	options: [
		{
			name: 'cosmetic',
			description: 'The name of the cosmetic',
			type: ApplicationCommandOptionType.String,
			required: true,
			autocomplete: true
		},
		{
			name: 'language',
			description: 'The language for the returned info',
			type: ApplicationCommandOptionType.String,
			choices: LanguageChoices
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const item = await findCosmetic(interaction.options.getString('cosmetic', true));
		const language = interaction.options.getString('language') as Language | null;

		if (item === null) {
			await interaction.editReply('No cosmetic matches your query.');
		}
		else {
			await interaction.editReply({ embeds: [createCosmeticEmbed(language === null ? item : await fortniteAPI.findCosmetic({ id: item.id, language }))] });
		}
	}
});