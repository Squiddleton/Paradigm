import { SlashCommand } from '@squiddleton/discordjs-util';
import type { Language } from '@squiddleton/fortnite-api';
import { normalize } from '@squiddleton/util';
import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, DiscordAPIError, type MessageActionRowComponentBuilder, RESTJSONErrorCodes, StringSelectMenuBuilder } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { ErrorMessage, LanguageChoices, Time } from '../../util/constants.js';
import { createCosmeticEmbed, getCosmeticLargeIcon, getCosmeticName, getCosmetics } from '../../util/fortnite.js';
import { messageComponentCollectorFilter } from '../../util/functions.js';
import type { ButtonOrMenu } from '../../util/types.js';

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

		const cosmetic = getCosmetics().find(c => [normalize(c.id), normalize(getCosmeticName(c))].includes(normalize(interaction.options.getString('cosmetic', true))));
		const language = interaction.options.getString('language') as Language | null;

		if (cosmetic === undefined) {
			await interaction.editReply('No cosmetic matches your query.');
			return;
		}

		const embed = createCosmeticEmbed(language === null ? cosmetic : await fortniteAPI.brCosmeticsSearch({ id: cosmetic.id, language }));
		if (!('variants' in cosmetic)) {
			await interaction.editReply({ embeds: [embed] });
			return;
		}

		const { variants } = cosmetic;

		if (!variants?.length) {
			await interaction.editReply({ embeds: [embed] });
			return;
		}

		const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [
			new ActionRowBuilder<ButtonBuilder>()
				.setComponents(
					new ButtonBuilder()
						.setCustomId('featured')
						.setLabel('Featured Image')
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId('lock')
						.setLabel('Lock Image In')
						.setStyle(ButtonStyle.Primary)
				),
			...variants.slice(0, 4).map(v => new ActionRowBuilder<StringSelectMenuBuilder>()
				.setComponents(new StringSelectMenuBuilder()
					.setCustomId(v.channel)
					.setMinValues(1)
					.setPlaceholder((v.type ?? v.channel).toUpperCase())
					.setOptions(v.options.slice(0, 25).map(o => ({ label: (o.name ?? 'OTHER').toUpperCase(), value: o.tag })))
				)
			)
		];

		const message = await interaction.editReply({ components, embeds: [embed] });
		const collector = message.createMessageComponentCollector<ButtonOrMenu>({ filter: messageComponentCollectorFilter(interaction), time: Time.CollectorDefault });

		collector
			.on('collect', async i => {
				if (i.isButton()) {
					switch (i.customId) {
						case 'featured': {
							for (const component of components) {
								component.setComponents(component.components.map(c => c instanceof StringSelectMenuBuilder
									? c.setOptions(c.options.map(o => ({ label: o.toJSON().label, value: o.toJSON().value })))
									: c
								));
							}
							await i.update({ components, embeds: [embed.setImage(getCosmeticLargeIcon(cosmetic))] });
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
					component.setComponents(component.components.map(c => c instanceof StringSelectMenuBuilder
						? c.setOptions(c.options.map(o => {
							const option = o.toJSON();
							return { label: option.label, value: option.value, default: c.toJSON().custom_id === i.customId && option.value === optionChosen.tag };
						}))
						: c
					));
				}

				await i.update({ components, embeds: [embed.setImage(optionChosen.image)] });
			})
			.once('end', async (collected, reason) => {
				if (reason === 'time') {
					try {
						await interaction.editReply({ components: [] });
					}
					catch (error) {
						const errorCodes: (string | number)[] = [RESTJSONErrorCodes.InvalidWebhookToken, RESTJSONErrorCodes.UnknownMessage];
						if (!(error instanceof DiscordAPIError) || !errorCodes.includes(error.code)) throw error;
					}
				}
			});
	}
});