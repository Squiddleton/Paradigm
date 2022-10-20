import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, MessageActionRowComponentBuilder, SelectMenuBuilder } from 'discord.js';
import type { Language } from '@squiddleton/fortnite-api';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { createCosmeticEmbed, findCosmetic } from '../../util/fortnite.js';
import { DefaultCollectorTime, ErrorMessage, LanguageChoices } from '../../util/constants.js';
import fortniteAPI from '../../clients/fortnite.js';
import { messageComponentCollectorFilter } from '../../util/functions.js';

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

		const cosmetic = await findCosmetic(interaction.options.getString('cosmetic', true));
		const language = interaction.options.getString('language') as Language | null;

		if (cosmetic === null) {
			await interaction.editReply('No cosmetic matches your query.');
			return;
		}

		const { variants } = cosmetic;
		const embed = createCosmeticEmbed(language === null ? cosmetic : await fortniteAPI.findCosmetic({ id: cosmetic.id, language }));

		if (!variants?.length) {
			await interaction.editReply({ embeds: [embed] });
			return;
		}

		const components = [
			new ActionRowBuilder<ButtonBuilder>()
				.setComponents(
					new ButtonBuilder()
						.setCustomId('featured')
						.setLabel('Featured Image')
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId('lock')
						.setLabel('Lock Image In')
						.setStyle(ButtonStyle.Danger)
				),
			...variants.slice(0, 4).map(variant => new ActionRowBuilder<MessageActionRowComponentBuilder>()
				.setComponents(new SelectMenuBuilder()
					.setCustomId(variant.channel)
					.setMinValues(1)
					.setPlaceholder(variant.type.toUpperCase())
					.setOptions(variant.options.slice(0, 25).map(option => ({ label: option.name.toUpperCase(), value: option.tag })))
				)
			)];

		const message = await interaction.editReply({ components, embeds: [embed] });
		const collector = message.createMessageComponentCollector({ filter: messageComponentCollectorFilter(interaction), time: DefaultCollectorTime });

		collector
			.on('collect', async i => {
				if (i.isButton()) {
					switch (i.customId) {
						case 'featured': {
							for (const component of components) {
								component.setComponents(component.components.map(menu => {
									return menu instanceof SelectMenuBuilder
										? menu.setOptions(menu.options.map(option => ({ label: option.toJSON().label, value: option.toJSON().value })))
										: menu;
								}
								));
							}
							await i.update({ components, embeds: [embed.setImage(cosmetic.images.featured ?? cosmetic.images.icon)] });
							break;
						}
						case 'lock': {
							await i.update({ components: [] });
							collector.stop();
							break;
						}
					}
					return;
				}

				const variantChosen = variants.find(v => v.channel === i.customId);
				if (variantChosen === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', `${variantChosen}`));

				const optionChosen = variantChosen.options.find(o => o.tag === i.values[0]);
				if (optionChosen === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', `${optionChosen}`));

				for (const component of components) {
					component.setComponents(component.components.map(menu => {
						return menu instanceof SelectMenuBuilder
							? menu.setOptions(menu.options.map(o => {
								const option = o.toJSON();
								return { label: option.label, value: option.value, default: menu.toJSON().custom_id === i.customId && option.value === optionChosen.tag };
							}))
							: menu;
					}
					));
				}

				await i.update({ components, embeds: [embed.setImage(optionChosen.image)] });
			})
			.on('end', async (collected, reason) => {
				if (reason === 'time') await interaction.editReply({ components: [] });
			});
	}
});