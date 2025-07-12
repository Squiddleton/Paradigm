import { ClientEvent } from '@squiddleton/discordjs-util';
import { EpicAPIError } from '@squiddleton/epic';
import { type BRCosmetic, FortniteAPIError, type Playlist } from '@squiddleton/fortnite-api';
import { removeDuplicates } from '@squiddleton/util';
import { type ApplicationCommandOptionChoiceData, DiscordAPIError, type InteractionReplyOptions, MessageFlags, RESTJSONErrorCodes, type Snowflake, User } from 'discord.js';
import { type Rating, findBestMatch } from 'string-similarity';
import epicClient from '../clients/epic.js';
import fortniteAPI from '../clients/fortnite.js';
import config from '../config.js';
import guildModel from '../models/guilds.js';
import memberModel from '../models/members.js';
import { DiscordClient } from '../util/classes.js';
import { ErrorMessage } from '../util/constants.js';
import { getBRCosmetics, getCosmeticName, getCosmetics } from '../util/fortnite.js';
import { getUser } from '../util/users.js';

export default new ClientEvent({
	name: 'interactionCreate',
	async execute(interaction) {
		const userId = interaction.user.id;
		const inCachedGuild = interaction.inCachedGuild();

		if (interaction.isAutocomplete()) {
			const { name, value } = interaction.options.getFocused(true);
			const input = value === '' ? 'a' : value;

			try {
				const cosmetics = getBRCosmetics();
				const allCosmetics = getCosmetics();

				const mapByName = (item: BRCosmetic | Playlist) => item.name;

				const mapByTarget = (rating: Rating): ApplicationCommandOptionChoiceData => ({ name: rating.target, value: rating.target });

				const sortByRating = (a: Rating, b: Rating) => (a.rating === b.rating) ? a.target.localeCompare(b.target) : (b.rating - a.rating);

				const filterCosmetics = async (type: string) => {
					if (cosmetics.length === 0) {
						await interaction.respond([]);
						return;
					}

					const filteredCosmetics = cosmetics
						.filter(c => c.type.value === type)
						.map(mapByName)
						.filter((n): n is string => n !== undefined);

					const { ratings } = findBestMatch(input, filteredCosmetics);

					const choices = ratings
						.sort(sortByRating)
						.slice(0, 25)
						.map(mapByTarget);
					await interaction.respond(choices);
				};

				switch (name) {
					case 'cosmetic': {
						let filteredCosmetics = allCosmetics;

						if (filteredCosmetics.length === 0) {
							await interaction.respond([]);
							return;
						}

						if (interaction.commandName === 'wishlist' && interaction.options.getSubcommand() === 'remove') {
							const userResult = getUser(userId);
							if (userResult === null || userResult.wishlistCosmeticIds.length === 0) {
								await interaction.respond([]);
								return;
							}
							filteredCosmetics = filteredCosmetics.filter(cosmetic => userResult.wishlistCosmeticIds.includes(cosmetic.id));
						}

						const { ratings } = findBestMatch(input, filteredCosmetics.map(c => `${getCosmeticName(c)} (${'type' in c ? c.type.displayValue : 'Jam Track'})`));
						const choices = ratings
							.sort(sortByRating)
							.slice(0, 25)
							.map(({ target }) => {
								const match = /(.*) \(([^)]+)\)/.exec(target);
								if (match === null) throw new TypeError(`The target ${target} did not match the RegExp`);

								const [, cosmeticName, cosmeticType] = match;
								const cosmetic = filteredCosmetics.find(c => getCosmeticName(c) === cosmeticName && ('type' in c ? c.type.displayValue : 'Jam Track') === cosmeticType);
								if (cosmetic === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', target));

								return { name: target.slice(0, 100), value: cosmetic.id };
							});
						await interaction.respond(choices);
						break;
					}
					case 'playlist': {
						let playlists: Playlist[];
						try {
							playlists = await fortniteAPI.playlists();
						}
						catch (error) {
							if (error instanceof FortniteAPIError && error.code === 503) {
								await interaction.respond([]);
								return;
							}
							throw error;
						}
						const playlistNames = removeDuplicates(playlists.map(mapByName).filter((n): n is string => n !== undefined));
						const { ratings } = findBestMatch(input, playlistNames);
						const choices = ratings.sort(sortByRating).map(mapByTarget).slice(0, 25);
						await interaction.respond(choices);
						break;
					}
					case 'outfit': {
						await filterCosmetics('outfit');
						break;
					}
					case 'backbling': {
						await filterCosmetics('backpack');
						break;
					}
					case 'pickaxe': {
						await filterCosmetics('pickaxe');
						break;
					}
					case 'glider': {
						await filterCosmetics('glider');
						break;
					}
					case 'wrap': {
						await filterCosmetics('wrap');
						break;
					}
					case 'milestone': {
						if (!inCachedGuild) throw new Error(ErrorMessage.OutOfCachedGuild);
						const { guildId } = interaction;
						const guildResult = await guildModel.findById(guildId);
						if (guildResult === null) {
							await interaction.respond([]);
							return;
						}

						let milestones = guildResult.milestones.map(m => m.name);
						const memberOption = interaction.options.get('member')?.value;
						if (typeof memberOption === 'string') {
							const memberResult = await memberModel.findOne({ userId: memberOption, guildId });
							if (memberResult !== null) {
								milestones = milestones.filter(m => !memberResult.milestones.includes(m));
							}
						}

						if (milestones.length === 0) {
							await interaction.respond([]);
							return;
						}
						const { ratings } = findBestMatch(input, milestones);
						const choices = ratings.sort(sortByRating).map(mapByTarget).slice(0, 25);
						await interaction.respond(choices);
						break;
					}
				}
			}
			catch (error) {
				if (!(error instanceof DiscordAPIError) || error.code !== RESTJSONErrorCodes.UnknownInteraction) throw error;
			}
		}

		else if (interaction.isCommand()) {
			const { client } = interaction;
			DiscordClient.assertReadyClient(client);

			const command = client.commands.get(interaction.commandName);
			if (command === undefined) {
				await interaction.reply({ content: 'I could not find a command matching that name!', flags: MessageFlags.Ephemeral });
				return;
			}

			try {
				// TODO: Simplify this block
				if (interaction.isChatInputCommand() && !('type' in command)) {
					await command.execute(interaction, client);
				}
				else if ('type' in command) {
					if (interaction.isMessageContextMenuCommand() && command.isMessage()) {
						await command.execute(interaction, client);
					}
					else if (interaction.isUserContextMenuCommand() && command.isUser()) {
						await command.execute(interaction, client);
					}
				}
			}
			catch (error) {
				const date = new Date().toLocaleString('en-us', { timeZone: 'America/New_York' });

				if (error instanceof EpicAPIError && error.status === 401) {
					await epicClient.auth.authenticate(config.epicDeviceAuth);
					console.log(`The Epic client's access token was unauthorized, but it successfully reauthenticated at ${date}.`);
					const errorMessage: InteractionReplyOptions = {
						content: 'An internal error occurred, but it has been resolved. Try the command again!',
						flags: MessageFlags.Ephemeral
					};
					if (interaction.replied || interaction.deferred) await interaction.followUp(errorMessage);
					else await interaction.reply(errorMessage);
				}

				const isUnknownInteraction = (e: unknown) => e instanceof DiscordAPIError && e.code === RESTJSONErrorCodes.UnknownInteraction;

				const firstIsUnknownInteraction = isUnknownInteraction(error);

				if (firstIsUnknownInteraction) {
					console.error(`Unknown Interaction thrown by the ${command.name} command:`, interaction.options.data);
				}
				else {
					console.error(
						`An error has occurred while executing the ${command.name} command: `,
						{
							date,
							guild: `${interaction.guild?.name ?? 'Direct Message'} (${interaction.guildId})`,
							channel: `${inCachedGuild ? interaction.channel?.name ?? 'Unknown Channel' : 'Direct Message'} (${interaction.channelId})`,
							user: `${interaction.user.displayName} (${userId})`,
							options: interaction.options.data
						},
						error
					);
				}
				const { owner } = client.application;
				if (!(owner instanceof User)) throw new Error(ErrorMessage.NotUserOwned);
				const errorMessage: InteractionReplyOptions = {
					content: firstIsUnknownInteraction
						? 'That command timed out internally; please try again.'
						: `There was an error while executing that command!  ${userId === owner.id ? (error instanceof Error ? error.message : 'The error is not an Error instance.') : `Please contact ${owner.displayName} if this issue persists.`}`,
					flags: MessageFlags.Ephemeral
				};

				try {
					if (interaction.replied || interaction.deferred) await interaction.followUp(errorMessage);
					else await interaction.reply(errorMessage);
				}
				catch (error2) {
					if (!isUnknownInteraction(error2)) console.error(error2);
				}
			}
		}

		else if (interaction.isButton() && interaction.customId === 'giveaway' && inCachedGuild) {
			const { guildId } = interaction;
			const messageId = interaction.message.id;

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			if (interaction.member.joinedTimestamp !== null && interaction.member.joinedTimestamp + 6 * 86400000 > Date.now()) {
				await interaction.editReply('You need to have been in the server for at least 6 days to enter.');
				return;
			}

			const guildResult = await guildModel.findByIdAndUpdate(guildId, {}, { new: true, upsert: true });

			const giveawayResult = guildResult.giveaways.find(g => g.messageId === messageId);
			if (giveawayResult === undefined) throw new Error(ErrorMessage.UnexpectedValue.replace('{value}', messageId));

			if (giveawayResult.entrants.includes(userId)) {
				await interaction.editReply('You have already entered this giveaway.');
				return;
			}

			const entries = [userId];
			for (const role of giveawayResult.bonusRoles) {
				if (interaction.member.roles.cache.has(role.id)) {
					const bonusEntries = new Array<Snowflake>(role.amount).fill(userId);
					entries.push(...bonusEntries);
				}
			}

			await guildModel.updateOne(
				{
					'_id': guildId,
					'giveaways.messageId': interaction.message.id
				},
				{ $push: { 'giveaways.$.entrants': { $each: entries } } }
			);
			await interaction.editReply(`You have successfully entered${entries.length === 1 ? '' : ` ${entries.length} times due to your roles`}. Check back when the giveaway ends to see if you won.`);
		}
	}
});