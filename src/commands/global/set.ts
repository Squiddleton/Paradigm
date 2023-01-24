import { SlashCommand } from '@squiddleton/discordjs-util';
import type { Cosmetic } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { TimestampedEmbed } from '../../util/classes.js';

export default new SlashCommand({
	name: 'set',
	description: 'List all cosmetics in a set',
	options: [
		{
			name: 'set',
			description: 'The set\'s name',
			type: ApplicationCommandOptionType.String,
			required: true
		}
	],
	scope: 'Global',
	async execute(interaction) {
		await interaction.deferReply();
		const set = interaction.options.getString('set', true);
		let cosmetics: Cosmetic[] = [];
		try {
			cosmetics = await fortniteAPI.filterCosmetics({ set });
		}
		catch {
			await interaction.editReply('No set matches your input.');
			return;
		}

		const cosmeticToAddedTime = (cosmetic: Cosmetic) => new Date(cosmetic.added).getTime();

		await interaction.editReply({
			embeds: [
				new TimestampedEmbed()
					.setTitle(`Set: **${cosmetics[0].set!.value}**`)
					.setDescription(cosmetics
						.sort((a, b) => cosmeticToAddedTime(a) - cosmeticToAddedTime(b))
						.map(c => `${c.name} (${c.type.displayValue})`)
						.join('\n')
					)
			]
		});
	}
});