import { User, PermissionsBitField, InteractionType, RESTJSONErrorCodes, ApplicationCommandOptionChoiceData } from 'discord.js';
import fetch from 'node-fetch';
import { findBestMatch, Rating } from 'string-similarity';

import client from '../clients/discord.js';
import giveaways from'../schemas/giveaways.js';
import giveawayusers from'../schemas/giveawayusers.js';
import behavior from'../schemas/behavior.js';
import { noPunc } from'../util/functions.js';
import milestoneSchema from '../schemas/milestones.js';
import milestoneUserSchema from '../schemas/milestoneusers.js';
import { cosmetics, grantMilestone, itemShopCosmetics } from '../util/fortnite.js';
import { Event } from '../types/types.js';
import { Cosmetic, Playlist, PlaylistAPI } from '../types/fortniteapi.js';

const { data: playlistData } = await fetch('https://fortnite-api.com/v1/playlists').then(response => response.json()) as PlaylistAPI;

const sortByRating = (a: Rating, b: Rating): number => {
	if (a.rating === b.rating) return a.target.localeCompare(b.target);
	return b.rating - a.rating;
};

const mapByTarget = (c: Rating): ApplicationCommandOptionChoiceData => ({ name: c.target, value: c.target });


const mapById = (c: Rating): ApplicationCommandOptionChoiceData => {
	const cosmetic = itemShopCosmetics.find(cos => cos.name === c.target);
	if (cosmetic === undefined) throw new Error(`No cosmetic has the name "${c.target}"`);
	return { name: `${cosmetic.name} (${cosmetic.type.displayValue})`, value: cosmetic.id };
};

const mapByName = (c: Cosmetic | Playlist) => c.name ?? 'null';

export default new Event<'interactionCreate'>({
	name: 'interactionCreate',
	async execute(interaction) {
		if (!client.isReady()) throw new Error('The client is not ready');

		const inCachedGuild = interaction.inCachedGuild();
		const { owner } = client.application;
		if (!(owner instanceof User)) return;

		const errorMessage = `There was an error trying to execute that command!  Please contact ${owner.tag} or DM me if this issue persists.`;

		if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
			const { name, value } = interaction.options.getFocused(true);
			if (typeof value !== 'string') throw new Error('Unexpected autocomplete value type.');
			const input = noPunc(value) ?? '';

			try {
				switch (name) {
					case 'cosmetic': {
						const isWishlist = interaction.commandName === 'wishlist';
						const closest = findBestMatch(input, (isWishlist ? itemShopCosmetics : cosmetics).map(mapByName));
						const choices = closest.ratings.sort(sortByRating).map(isWishlist ? mapById : mapByTarget).slice(0, 10);
						return interaction.respond(choices);
					}
					case 'ltm': {
						const closest = findBestMatch(input, [...new Set(playlistData.map(mapByName))]);
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						return interaction.respond(choices);
					}
					case 'outfit': {
						const closest = findBestMatch(input, cosmetics.filter(i => i.type.displayValue === 'Outfit').map(mapByName));
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						return interaction.respond(choices);
					}
					case 'backbling': {
						const closest = findBestMatch(input, cosmetics.filter(i => i.type.displayValue === 'Back Bling').map(mapByName));
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						return interaction.respond(choices);
					}
					case 'harvestingtool': {
						const closest = findBestMatch(input, cosmetics.filter(i => i.type.displayValue === 'Harvesting Tool').map(mapByName));
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						return interaction.respond(choices);
					}
					case 'glider': {
						const closest = findBestMatch(input, cosmetics.filter(i => i.type.displayValue === 'Glider').map(mapByName));
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						return interaction.respond(choices);
					}
					case 'wrap': {
						const closest = findBestMatch(input, cosmetics.filter(i => i.type.displayValue === 'Wrap').map(mapByName));
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						return interaction.respond(choices);
					}
					case 'milestone': {
						const { guildId } = interaction;
						let milestones = (await milestoneSchema.find({ guildId })).map(m => m.name);
						const userId = interaction.options.data[0].options?.find(option => option.name === 'member')?.value;
						if (userId) {
							const userMilestones = await milestoneUserSchema.findOne({ userId, guildId });
							milestones = milestones.filter(m => !userMilestones?.milestones.includes(m));
						}

						const closest = findBestMatch(input, milestones.length > 0 ? milestones : ['None']);
						const choices = closest.ratings.sort(sortByRating).map(mapByTarget).slice(0, 10);
						return interaction.respond(choices[0]?.name === 'None' ? [] : choices);
					}
				}
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			catch (error: any) {
				if (error.code !== RESTJSONErrorCodes.UnknownInteraction) throw error;
			}
		}

		else if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (command === undefined) {
				await interaction.reply({ content: 'I could not find a command matching that name!', ephemeral: true });
				return;
			}

			if (interaction.guildId === '486932163636232193') {
				await grantMilestone(interaction.user.id, '486932163636232193', 'Operant conditioning');
			}

			try {
				await command.execute(interaction, client);
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

		else if (interaction.isButton() && interaction.customId === 'fnbrgiveaway' && inCachedGuild) {
			const userId = interaction.user.id;
			await interaction.deferReply({ ephemeral: true });
			if (interaction.member.joinedTimestamp !== null && interaction.member.joinedTimestamp + 6 * 86400000 > Date.now()) {
				await interaction.editReply('You need to have been in the server for at least 6 days to enter.');
				return;
			}

			const giveawayResult = await giveaways.findById(interaction.message.id);
			if (giveawayResult === null) throw new Error(`No giveaway was found for the id "${interaction.message.id}"`);
			if (giveawayResult.entrants.includes(userId)) {
				await interaction.editReply('You have already entered this giveaway.');
				return;
			}

			if (!giveawayResult.allowMods && (interaction.member.roles.cache.has('544952148790738954') || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))) {
				await interaction.editReply('Mods cannot enter giveaways.');
				return;
			}

			const userResult = await giveawayusers.findOneAndUpdate(
				{ userId },
				{ $setOnInsert: { guildId: interaction.guildId, messages: [{ day: 30, msgs: 0 }] } },
				{ new: true, upsert: true }
			);
			if (userResult.messages.reduce((acc, msg) => acc + msg.msgs, 0) < giveawayResult.messages) {
				await interaction.editReply('You do not currently have enough messages to enter.  Continue actively participating, then try again later.');
				return;
			}

			const behaviorResult = await behavior.findById(interaction.guildId);
			if (behaviorResult === null) throw new Error(`No behavior document was found for the guild with the id "${interaction.guildId}"`);
			if (behaviorResult.behaviors[0][userId]) {
				await interaction.editReply('Only users with no mutes or bans in the past 30 days may enter.');
				return;
			}

			const entries = [userId];
			if (giveawayResult.regEntries > 0 && interaction.member.roles.cache.has('886071010581966851')) {
				for (let i = 0; i < giveawayResult.regEntries; i++) {
					entries.push(userId);
				}
			}
			if (giveawayResult.boosterEntries > 0 && interaction.member.roles.cache.has('585533593565003819')) {
				for (let i = 0; i < giveawayResult.boosterEntries; i++) {
					entries.push(userId);
				}
			}

			await giveaways.updateOne(
				{ _id: interaction.message.id },
				{ $push: { entrants: { $each: entries } } }
			);
			await interaction.editReply(`You have successfully entered${entries.length === 1 ? '' : ` ${entries.length} times due to your roles`}.  Check back when the giveaway ends to see if you won.`);
		}
	}
});