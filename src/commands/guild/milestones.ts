import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import guildSchema from '../../schemas/guilds.js';
import milestoneUserSchema from '../../schemas/milestoneusers.js';
import { Scope, SlashCommand } from '../../types/types.js';
import { isRarity, rarityOrdering } from '../../util/fortnite.js';

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
	scope: Scope.Guild,
	async execute(interaction) {
		if (!interaction.inCachedGuild()) throw new Error(`The /${this.name} command should only be usable in guilds`);

		const member = interaction.options.getMember('member') ?? interaction.member;
		const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
		const { displayName } = member;
		const user = await member.user.fetch();
		const { guildId } = interaction;

		const result = await milestoneUserSchema.findOneAndUpdate({ userId: member.id, guildId }, {}, { new: true, upsert: true });

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

				if (fullA === undefined) throw new Error(`No milestone matches the name "${a}"`);
				if (fullB === undefined) throw new Error(`No milestone matches the name "${b}"`);
				if (!isRarity(fullA.rarity)) throw new Error(`"${fullA.rarity} is not a valid rarity`);
				if (!isRarity(fullB.rarity)) throw new Error(`"${fullB.rarity} is not a valid rarity`);

				return fullA.rarity === fullB.rarity ? fullA.name > fullB.name ? 1 : -1 : rarityOrdering[fullA.rarity] - rarityOrdering[fullB.rarity];
			})) {
				const milestoneWithDescription = milestones.find(m => m.name === milestone);
				if (milestoneWithDescription === undefined) throw new Error(`No milestone matches the name "${milestone}"`);
				if (i < 25) embed.addFields([{ name: milestone, value: milestoneWithDescription.description, inline: true }]);
				i++;
			}
		}

		await interaction.reply({ embeds: [embed], ephemeral });
	}
});