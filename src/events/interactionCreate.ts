import { User, InteractionType, RESTJSONErrorCodes, ApplicationCommandOptionChoiceData, DiscordAPIError, AutocompleteInteraction } from 'discord.js';
import { findBestMatch, Rating } from 'string-similarity';

import client from '../clients/discord.js';
import guildSchema from'../schemas/guilds.js';
import giveawayusers from'../schemas/giveawayusers.js';
import behavior from'../schemas/behavior.js';
import { noPunc } from'../util/functions.js';
import milestoneUserSchema from '../schemas/milestoneusers.js';
import { cosmetics, itemShopCosmetics } from '../util/fortnite.js';
import { ContextMenu, Event, SlashCommand } from '../types/types.js';
import FortniteAPI from '../clients/fortnite.js';
import { Cosmetic, Playlist } from '@squiddleton/fortnite-api';

const mapByName = (item: Cosmetic | Playlist) => item.name ?? 'null';

const mapById = (rating: Rating): ApplicationCommandOptionChoiceData => {
	const cosmetic = itemShopCosmetics.find(cos => cos.name === rating.target);
	if (cosmetic === undefined) throw new Error(`No cosmetic has the name "${rating.target}"`);
	return { name: `${cosmetic.name} (${cosmetic.type.displayValue})`, value: cosmetic.id };
};

const mapByTarget = (rating: Rating): ApplicationCommandOptionChoiceData => ({ name: rating.target, value: rating.target });

const sortByRating = (a: Rating, b: Rating) => {
	if (a.rating === b.rating) return a.target.localeCompare(b.target);
	return b.rating - a.rating;
};

const filterCosmetics = async (interaction: AutocompleteInteraction, input: string, type: string) => {
	const closest = findBestMatch(input, cosmetics.filter(i => i.type.displayValue === type).map(mapByName));
	const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
	await interaction.respond(choices);
};

const cosmeticNames = cosmetics.map(mapByName);
const shopCosmeticNames = itemShopCosmetics.map(mapByName);

const playlists = [...new Set((await FortniteAPI.playlists()).map(mapByName))];

export default new Event({
	name: 'interactionCreate',
	async execute(interaction) {
		const inCachedGuild = interaction.inCachedGuild();
		const { owner } = client.application;
		if (!(owner instanceof User)) return;

		const errorMessage = `There was an error trying to execute that command!  Please contact ${owner.tag} or DM me if this issue persists.`;

		if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
			const { name, value } = interaction.options.getFocused(true);
			const input = value === '' ? 'a' : noPunc(value);

			try {
				switch (name) {
					case 'cosmetic': {
						const isWishlist = interaction.commandName === 'wishlist';
						const closest = findBestMatch(input, isWishlist ? cosmeticNames : shopCosmeticNames);
						const choices = closest.ratings.sort(sortByRating).map(isWishlist ? mapById : mapByTarget).slice(0, 10);
						await interaction.respond(choices);
						break;
					}
					case 'ltm': {
						const closest = findBestMatch(input, playlists);
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						await interaction.respond(choices);
						break;
					}
					case 'outfit': {
						await filterCosmetics(interaction, input, 'Outfit');
						break;
					}
					case 'backbling': {
						await filterCosmetics(interaction, input, 'Back Bling');
						break;
					}
					case 'harvestingtool': {
						await filterCosmetics(interaction, input, 'Harvesting Tool');
						break;
					}
					case 'glider': {
						await filterCosmetics(interaction, input, 'Glider');
						break;
					}
					case 'wrap': {
						await filterCosmetics(interaction, input, 'Wrap');
						break;
					}
					case 'milestone': {
						if (!interaction.inCachedGuild()) throw new Error('The /milestone command should only be usable in guilds');
						const { guildId } = interaction;
						let milestones = (await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true })).milestones.map(m => m.name);
						const userId = interaction.options.data[0].options?.find(option => option.name === 'member')?.value;
						if (userId) {
							const userMilestones = await milestoneUserSchema.findOne({ userId, guildId });
							milestones = milestones.filter(m => !userMilestones?.milestones.includes(m));
						}

						const closest = findBestMatch(input, milestones.length > 0 ? milestones : ['None']);
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						await interaction.respond(choices[0]?.name === 'None' ? [] : choices);
						break;
					}
				}
			}
			catch (error) {
				if (error instanceof DiscordAPIError && error.code !== RESTJSONErrorCodes.UnknownInteraction) throw error;
			}
		}

		else if (interaction.type === InteractionType.ApplicationCommand) {
			const command = client.commands.get(interaction.commandName);
			if (command === undefined) {
				await interaction.reply({ content: 'I could not find a command matching that name!', ephemeral: true });
				return;
			}

			try {
				// TODO: Simplify this block
				if (interaction.isChatInputCommand() && command instanceof SlashCommand) {
					await command.execute(interaction, client);
				}
				else if (command instanceof ContextMenu) {
					if (interaction.isMessageContextMenuCommand() && command.isMessage()) {
						await command.execute(interaction, client);
					}
					else if (interaction.isUserContextMenuCommand() && command.isUser()) {
						await command.execute(interaction, client);
					}
				}
			}
			catch (error) {
				console.error(
					`An error has occurred while executing the ${command.name} command: `,
					{
						date: new Date().toLocaleString('en-us', { timeZone: 'America/New_York' }),
						guild: `${interaction.guild?.name ?? 'Direct Message'} (${interaction.guildId})`,
						channel: `${interaction.inCachedGuild() ? interaction.channel?.name ?? 'Unknown Channel' : 'Direct Message' } (${interaction.channelId})`,
						user: `${interaction.user.tag} (${interaction.user.id})`
					},
					error
				);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(errorMessage);
				}
				else {
					await interaction.reply(errorMessage);
				}
			}
		}

		else if (interaction.isButton() && interaction.customId === 'giveaway' && inCachedGuild) {
			const userId = interaction.user.id;
			await interaction.deferReply({ ephemeral: true });
			if (interaction.member.joinedTimestamp !== null && interaction.member.joinedTimestamp + 6 * 86400000 > Date.now()) {
				await interaction.editReply('You need to have been in the server for at least 6 days to enter.');
				return;
			}

			const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });

			const giveawayResult = guildResult.giveaways.find(g => g.messageId === interaction.message.id);
			if (giveawayResult === undefined) throw new Error(`No giveaway was found for the id "${interaction.message.id}"`);

			if (giveawayResult.entrants.includes(userId)) {
				await interaction.editReply('You have already entered this giveaway.');
				return;
			}

			const userResult = await giveawayusers.findOneAndUpdate(
				{ userId, guildId: interaction.guildId },
				{},
				{ new: true, upsert: true }
			);
			if (userResult.messages.reduce((acc, msg) => acc + msg.msgs, 0) < giveawayResult.messages) {
				await interaction.editReply('You do not currently have enough messages to enter.  Continue actively participating, then try again later.');
				return;
			}

			if (interaction.guildId === client.exclusiveGuild.id) {
				const behaviorResult = await behavior.findById(interaction.guildId);
				if (behaviorResult === null) throw new Error(`No behavior document was found for the guild with the id "${interaction.guildId}"`);
				if (behaviorResult.behaviors[0][userId]) {
					await interaction.editReply('Only users with no mutes or bans in the past 30 days may enter.');
					return;
				}
			}

			const entries = [userId];
			const [role1, role2] = giveawayResult.bonusRoles;
			if (role1 !== undefined && interaction.member.roles.cache.has(role1.id)) {
				for (let i = 0; i < role1.amount; i++) {
					entries.push(userId);
				}
			}
			if (role2 !== undefined && interaction.member.roles.cache.has(role2.id)) {
				for (let i = 0; i < role2.amount; i++) {
					entries.push(userId);
				}
			}

			await guildSchema.updateOne(
				{
					_id: interaction.guildId,
					'giveaways.messageId': interaction.message.id
				},
				{ $push: { 'giveaways.$.entrants': { $each: entries } } }
			);
			await interaction.editReply(`You have successfully entered${entries.length === 1 ? '' : ` ${entries.length} times due to your roles`}.  Check back when the giveaway ends to see if you won.`);
		}
	}
});