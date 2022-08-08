import { ApplicationCommandOptionType } from 'discord.js';
import { noPunc } from '../../util/functions.js';
import { createCosmeticEmbed, cosmetics } from '../../util/fortnite.js';
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
			name: 'type',
			type: ApplicationCommandOptionType.String,
			description: 'The type of cosmetic',
			choices: [
				{
					name: 'Outfit',
					value: 'outfit'
				},
				{
					name: 'Back Bling',
					value: 'backpack'
				},
				{
					name: 'Emote',
					value: 'emote'
				},
				{
					name: 'Glider',
					value: 'glider'
				},
				{
					name: 'Emoticon',
					value: 'emoji'
				},
				{
					name: 'Loading Screen',
					value: 'loadingscreen'
				},
				{
					name: 'Harvesting Tool',
					value: 'pickaxe'
				},
				{
					name: 'Contrail',
					value: 'contrail'
				},
				{
					name: 'Spray',
					value: 'spray'
				},
				{
					name: 'Toy',
					value: 'toy'
				},
				{
					name: 'Pet',
					value: 'petcarrier'
				},
				{
					name: 'Music',
					value: 'music'
				},
				{
					name: 'Wrap',
					value: 'wrap'
				},
				{
					name: 'Banner',
					value: 'banner'
				}
			]
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

		const input = noPunc(interaction.options.getString('cosmetic', true));
		const type = interaction.options.getString('type');
		const language = interaction.options.getString('language') as Language | null;
		const data = type !== null ? cosmetics.filter(i => i.type.value === type) : cosmetics;

		const item = data.find(o => [o.name, o.id].some(keyword => noPunc(keyword) === input));
		if (item === undefined) {
			await interaction.editReply('No cosmetic matches your query.');
		}
		else {
			await interaction.editReply({ embeds: [createCosmeticEmbed(language === null ? item : await FortniteAPI.findCosmetic({ id: item.id, language }))] });
		}
	}
});