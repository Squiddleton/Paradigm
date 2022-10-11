import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import guildSchema from '../../schemas/guilds.js';
import memberSchema from '../../schemas/members.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { isRarity } from '../../util/fortnite.js';
import { ErrorMessages, RarityOrdering } from '../../util/constants.js';

export default new SlashCommand({
	name: 'milestones',
	description: 'List a member\'s milestones',
	options: [
		{
			name: 'member',
			description: 'The member whose milestones to display; defualts to yourself',
			type: ApplicationCommandOptionType.User
		},
		{
			name: 'ephemeral',
			description: 'Whether to make the reply only visible to yourself; defaults to false',
			type: ApplicationCommandOptionType.Boolean
		}
	],
	scope: 'Guild',
	async execute(interaction) {
		if (!interaction.inCachedGuild()) throw new Error(ErrorMessages.OutOfGuild);

		const member = interaction.options.getMember('member') ?? interaction.member;
		const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
		const { displayName } = member;
		const user = await member.user.fetch();
		const { guildId } = interaction;

		const result = await memberSchema.findOneAndUpdate({ userId: member.id, guildId }, {}, { new: true, upsert: true });

		const embed = new EmbedBuilder()
			.setTitle(`${displayName}'${displayName.endsWith('s') ? '' : 's'} Milestones`)
			.setThumbnail(member.displayAvatarURL())
			.setColor(user.accentColor ?? null)
			.setTimestamp();

		if (result.milestones.length === 0) {
			embed.setDescription('No milestones');
		}
		else {
			const { milestones } = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });

			let i = 0;
			for (const milestone of result.milestones.sort((a, b) => {
				const fullA = milestones.find(m => m.name === a);
				const fullB = milestones.find(m => m.name === b);

				if (fullA === undefined) throw new Error(ErrorMessages.UnexpectedValue.replace('{value}', a));
				if (fullB === undefined) throw new Error(ErrorMessages.UnexpectedValue.replace('{value}', b));
				if (!isRarity(fullA.rarity)) {
					throw new TypeError(ErrorMessages.FalseTypeguard.replace('{value}', fullA.rarity));
				}
				else if (!isRarity(fullB.rarity)) {
					throw new TypeError(ErrorMessages.FalseTypeguard.replace('{value}', fullB.rarity));
				}

				return fullA.rarity === fullB.rarity ? fullA.name > fullB.name ? 1 : -1 : RarityOrdering[fullA.rarity] - RarityOrdering[fullB.rarity];
			})) {
				const milestoneWithDescription = milestones.find(m => m.name === milestone);
				if (milestoneWithDescription === undefined) throw new Error(ErrorMessages.UnexpectedValue.replace('{value}', milestone));
				if (i < 25) embed.addFields([{ name: milestone, value: milestoneWithDescription.description, inline: true }]);
				i++;
			}
		}

		await interaction.reply({ embeds: [embed], ephemeral });
	}
});