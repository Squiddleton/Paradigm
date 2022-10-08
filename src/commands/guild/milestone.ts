import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import guildSchema from '../../schemas/guilds.js';
import milestoneUserSchema from '../../schemas/milestoneusers.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { grantMilestone, isRarity } from '../../util/fortnite.js';
import { Rarities, RarityOrdering } from '../../constants.js';

export default new SlashCommand({
	name: 'milestone',
	description: 'Various methods with milestone moderation',
	options: [
		{
			name: 'create',
			description: 'Create a new milestone',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'name',
					description: 'The milestone\'s name',
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: 'description',
					description: 'The milestone\'s description',
					type: ApplicationCommandOptionType.String,
					required: true
				},
				{
					name: 'rarity',
					description: 'The milestone\'s rarity',
					type: ApplicationCommandOptionType.String,
					required: true,
					choices: Rarities.map(rarity => ({ name: rarity, value: rarity }))
				}
			]
		},
		{
			name: 'delete',
			description: 'Delete a milestone',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'milestone',
					description: 'The milestone\'s name',
					type: ApplicationCommandOptionType.String,
					required: true,
					autocomplete: true
				}
			]
		},
		{
			name: 'grant',
			description: 'Grant a member a milestone',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'member',
					description: 'The member to receive the milestone',
					type: ApplicationCommandOptionType.User,
					required: true
				},
				{
					name: 'milestone',
					description: 'The milestone\'s name',
					type: ApplicationCommandOptionType.String,
					required: true,
					autocomplete: true
				}
			]
		},
		{
			name: 'list',
			description: 'List all available milestones',
			type: ApplicationCommandOptionType.Subcommand
		}
	],
	scope: 'Guild',
	permissions: PermissionFlagsBits.ManageGuild,
	async execute(interaction) {
		if (!interaction.inCachedGuild()) throw new Error(`The /${this.name} command should only be usable in guilds`);

		const { guildId } = interaction;
		switch (interaction.options.getSubcommand()) {
			case 'create': {
				const name = interaction.options.getString('name', true);
				const { milestones } = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				if (milestones.some(m => m.name === name)) {
					await interaction.reply({ content: 'A milestone already exists with that name.', ephemeral: true });
					return;
				}

				await guildSchema.findByIdAndUpdate(guildId, {
					$push: {
						milestones: {
							name,
							description: interaction.options.getString('description', true),
							rarity: interaction.options.getString('rarity', true)
						}
					}
				});
				await interaction.reply(`You created the following milestone: \`${name}\`.`);
				return;
			}
			case 'delete': {
				const milestoneName = interaction.options.getString('milestone', true);

				const matchingGuild = await guildSchema.findOneAndUpdate(
					{ _id: guildId, 'milestones.name': milestoneName },
					{ $pull: { milestones: { name: milestoneName } } });
				if (matchingGuild === null) {
					await interaction.reply({ content: 'There is no milestone by that name.', ephemeral: true });
					return;
				}

				await interaction.deferReply();
				await milestoneUserSchema.updateMany(
					{ guildId },
					{ $pull: { milestones: milestoneName } }
				);

				await interaction.editReply(`You deleted the following milestone: \`${milestoneName}\`.`);
				return;
			}
			case 'grant': {
				const member = interaction.options.getMember('member');
				if (member === null) {
					await interaction.reply('The provided members is not in this server.');
					return;
				}
				const milestoneName = interaction.options.getString('milestone', true);

				const { milestones } = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				const milestone = milestones.find(m => m.name === milestoneName);
				if (milestone === undefined) {
					await interaction.reply({ content: `The milestone \`${milestoneName}\` does not exist.`, ephemeral: true });
					return;
				}

				await grantMilestone(member.id, guildId, milestoneName);
				await interaction.reply(`You granted ${member.displayName} the following milestone: \`${milestoneName}\`.`);
				return;
			}
			case 'list': {
				const guildName = interaction.guild.name;
				const embed = new EmbedBuilder()
					.setTitle(`${guildName}'${guildName.endsWith('s') ? '' : 's'} Milestones`)
					.setThumbnail(interaction.guild.iconURL())
					.setTimestamp();

				const { milestones } = await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });

				if (milestones.length === 0) {
					embed.setDescription('No milestones');
				}
				else {
					let i = 0;
					for (const milestone of milestones.sort((a, b) => {
						if (!isRarity(a.rarity) || !isRarity(b.rarity)) throw new Error(`The rarity of a milestone in the guild with the id of "${guildId}" is not a valid rarity.`);
						return a.rarity === b.rarity ? a.name > b.name ? 1 : -1 : RarityOrdering[a.rarity] - RarityOrdering[b.rarity];
					})) {
						if (i < 25) embed.addFields([{ name: milestone.name, value: milestone.description, inline: true }]);
						i++;
					}
				}

				await interaction.reply({ embeds: [embed], ephemeral: true });
				return;
			}
		}
	}
});