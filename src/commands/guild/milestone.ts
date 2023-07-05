import { SlashCommand } from '@squiddleton/discordjs-util';
import { formatPossessive } from '@squiddleton/util';
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import guildModel from '../../models/guilds.js';
import memberModel from '../../models/members.js';
import { ErrorMessage, Rarities, RarityOrdering } from '../../util/constants.js';
import { grantMilestone, isKey } from '../../util/functions.js';

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
					choices: Rarities.map(r => ({ name: r, value: r }))
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
		if (!interaction.inCachedGuild()) throw new Error(ErrorMessage.OutOfGuild);

		const { guildId } = interaction;
		switch (interaction.options.getSubcommand()) {
			case 'create': {
				const name = interaction.options.getString('name', true);
				const guildResult = await guildModel.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
				if (guildResult.milestones.some(m => m.name === name)) {
					await interaction.reply({ content: 'A milestone already exists with that name.', ephemeral: true });
					return;
				}

				guildResult.milestones.push({
					name,
					description: interaction.options.getString('description', true),
					rarity: interaction.options.getString('rarity', true)
				});
				await guildResult.save();
				await interaction.reply(`You created the following milestone: \`${name}\`.`);
				return;
			}
			case 'delete': {
				const milestoneName = interaction.options.getString('milestone', true);

				const guildResult = await guildModel.findOneAndUpdate(
					{ _id: guildId, 'milestones.name': milestoneName },
					{ $pull: { milestones: { name: milestoneName } } });
				if (guildResult === null) {
					await interaction.reply({ content: 'There is no milestone by that name.', ephemeral: true });
					return;
				}

				await interaction.deferReply();
				await memberModel.updateMany(
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

				const { milestones } = await guildModel.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });
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
				const embed = new EmbedBuilder()
					.setTitle(`${formatPossessive(interaction.guild.name)} Milestones`)
					.setThumbnail(interaction.guild.iconURL());

				const { milestones } = await guildModel.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });

				if (milestones.length === 0) {
					embed.setDescription('No milestones');
				}
				else {
					milestones.sort((a, b) => {
						if (!isKey(a.rarity, RarityOrdering)) {
							throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', a.rarity));
						}
						else if (!isKey(b.rarity, RarityOrdering)) {
							throw new TypeError(ErrorMessage.FalseTypeguard.replace('{value}', b.rarity));
						}
						return a.rarity === b.rarity ? a.name > b.name ? 1 : -1 : RarityOrdering[a.rarity] - RarityOrdering[b.rarity];
					});
					let i = 0;
					for (const milestone of milestones) {
						if (i < 25) embed.addFields([{ name: milestone.name, value: milestone.description, inline: true }]);
						i++;
					}
				}

				await interaction.reply({ embeds: [embed], ephemeral: true });
			}
		}
	}
});