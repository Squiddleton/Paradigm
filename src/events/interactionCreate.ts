import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, DiscordAPIError, InteractionReplyOptions, RESTJSONErrorCodes, User } from 'discord.js';
import { Rating, findBestMatch } from 'string-similarity';
import { ClientEvent, ContextMenu, SlashCommand } from '@squiddleton/discordjs-util';
import type { Cosmetic, Playlist } from '@squiddleton/fortnite-api';
import guildSchema from'../schemas/guilds.js';
import memberSchema from'../schemas/members.js';
import { noPunc, removeDuplicates, sumMsgs } from'../util/functions.js';
import { fetchCosmetics } from '../util/fortnite.js';
import fortniteAPI from '../clients/fortnite.js';
import { ErrorMessage } from '../util/constants.js';
import { isReadyClient } from '../util/typeguards.js';

const mapByName = (item: Cosmetic | Playlist) => item.name;

const mapByTarget = (rating: Rating): ApplicationCommandOptionChoiceData => ({ name: rating.target, value: rating.target });

const sortByRating = (a: Rating, b: Rating) => (a.rating === b.rating) ? a.target.localeCompare(b.target) : (b.rating - a.rating);

const filterCosmetics = async (interaction: AutocompleteInteraction, input: string, type: string) => {
	const cosmetics = await fetchCosmetics();
	const closest = findBestMatch(input, cosmetics.filter(i => i.type.displayValue === type).map(mapByName));
	const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 25);
	await interaction.respond(choices);
};

export default new ClientEvent({
	name: 'interactionCreate',
	async execute(interaction) {
		const userId = interaction.user.id;
		const inCachedGuild = interaction.inCachedGuild();
		const { client } = interaction;
		if (!isReadyClient(client)) throw new Error(ErrorMessage.UnreadyClient);
		const { owner } = client.application;
		if (!(owner instanceof User)) throw new Error(ErrorMessage.NotUserOwned);

		if (interaction.isAutocomplete()) {
			const { name, value } = interaction.options.getFocused(true);
			const input = value === '' ? 'a' : noPunc(value);

			try {
				switch (name) {
					case 'cosmetic': {
						const shopOnly = interaction.commandName === 'wishlist';
						const cosmetics = await fetchCosmetics(shopOnly);
						const closest = findBestMatch(input, cosmetics.map(mapByName));
						const choices = closest.ratings.sort(sortByRating).map(rating => {
							const cosmetic = cosmetics.find(cos => cos.name === rating.target);
							if (cosmetic === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', rating.target));
							return { name: `${cosmetic.name} (${cosmetic.type.displayValue})`, value: cosmetic.id };
						}).slice(0, 25);
						await interaction.respond(choices);
						break;
					}
					case 'playlist': {
						const playlists = removeDuplicates((await fortniteAPI.playlists()).map(mapByName));
						const closest = findBestMatch(input, playlists);
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 25);
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
						if (!inCachedGuild) throw new Error(ErrorMessage.OutOfGuild);
						const { guildId } = interaction;
						let milestones = (await guildSchema.findByIdAndUpdate(guildId, {}, { new: true, upsert: true })).milestones.map(m => m.name);
						const memberOption = interaction.options.data[0].options?.find(option => option.name === 'member')?.value;
						if (memberOption) {
							const memberResult = await memberSchema.findOne({ userId: memberOption, guildId });
							milestones = milestones.filter(m => !memberResult?.milestones.includes(m));
						}

						const closest = findBestMatch(input, milestones.length > 0 ? milestones : ['None']);
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 25);
						await interaction.respond(choices[0]?.name === 'None' ? [] : choices);
						break;
					}
				}
			}
			catch (error) {
				if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.UnknownInteraction) throw error;
			}
		}

		else if (interaction.isCommand()) {
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
						channel: `${inCachedGuild ? interaction.channel?.name ?? 'Unknown Channel' : 'Direct Message' } (${interaction.channelId})`,
						user: `${interaction.user.tag} (${userId})`,
						options: interaction.options.data
					},
					error
				);
				const errorMessage: InteractionReplyOptions = {
					content: `There was an error while executing that command!  ${userId === owner.id ? (error instanceof Error ? error.message : 'The error is not an Error instance.') : `Please contact ${owner.tag} if this issue persists.`}`,
					ephemeral: true
				};
				(interaction.replied || interaction.deferred) ? await interaction.followUp(errorMessage) : await interaction.reply(errorMessage);
			}
		}

		else if (interaction.isButton() && interaction.customId === 'giveaway' && inCachedGuild) {
			await interaction.deferReply({ ephemeral: true });
			if (interaction.member.joinedTimestamp !== null && interaction.member.joinedTimestamp + 6 * 86400000 > Date.now()) {
				await interaction.editReply('You need to have been in the server for at least 6 days to enter.');
				return;
			}

			const guildResult = await guildSchema.findByIdAndUpdate(interaction.guildId, {}, { new: true, upsert: true });

			const giveawayResult = guildResult.giveaways.find(g => g.messageId === interaction.message.id);
			if (giveawayResult === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', interaction.message.id));

			if (giveawayResult.entrants.includes(userId)) {
				await interaction.editReply('You have already entered this giveaway.');
				return;
			}

			const memberResult = await memberSchema.findOneAndUpdate(
				{ userId, guildId: interaction.guildId },
				{},
				{ new: true, upsert: true }
			);
			if (memberResult.dailyMessages.reduce(sumMsgs, 0) < giveawayResult.messages) {
				await interaction.editReply('You do not currently have enough messages to enter. Continue actively participating, then try again later.');
				return;
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
			await interaction.editReply(`You have successfully entered${entries.length === 1 ? '' : ` ${entries.length} times due to your roles`}. Check back when the giveaway ends to see if you won.`);
		}
	}
});