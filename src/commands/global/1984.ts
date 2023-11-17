import { SlashCommand } from '@squiddleton/discordjs-util';
import { EmbedBuilder, bold } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';

export default new SlashCommand({
	name: '1984',
	description: 'View items that cannot be equipped in experiences rated Everyone 10+ or lower',
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();

		const cosmetics = await fortniteAPI.listCosmetics();
		const restrictedCosmetics = await fortniteAPI.filterCosmetics({ gameplayTag: 'Cosmetics.Gating.RatingMin.Teen' });

		const getValue = (type: string) => {
			const all = cosmetics.filter(c => c.type.value == type).length;
			const restricted = restrictedCosmetics.filter(c => c.type.value == type).length;

			return `${restricted} / ${all} (${Math.round(100 * restricted / all)}%)`;
		};

		await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle('Restricted Cosmetics')
					.setDescription(bold(`Total: ${restrictedCosmetics.length} / ${cosmetics.length} (${Math.round(100 * restrictedCosmetics.length / cosmetics.length)}%)`))
					.setFields(
						{ name: 'Outfits', value: getValue('outfit'), inline: true },
						{ name: 'Back Blings', value: getValue('backpack'), inline: true },
						{ name: 'Pickaxes', value: getValue('pickaxe'), inline: true },
						{ name: 'Gliders', value: getValue('glider'), inline: true },
						{ name: 'Contrails', value: getValue('contrail'), inline: true },
						{ name: 'Emotes', value: getValue('emote'), inline: true },
						{ name: 'Wraps', value: getValue('wrap'), inline: true },
						{ name: 'Music', value: getValue('music'), inline: true },
						{ name: 'Loading Screens', value: getValue('loadingscreen'), inline: true }
					)
					.setFooter({ text: 'You cannot use these items in experiences rated Everyone 10+ or lower.' })
			]
		});
	}
});