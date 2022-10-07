import { FortniteAPIError } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import users from '../../schemas/users.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import { EpicError, getLevels } from '../../util/epic.js';

const formatLevels = (levels: Record<string, number>, name?: string) => {
	return `${name === undefined
		? '**Your**'
		: `\`${name}'${['s', 'z'].some(l => name.toLowerCase().endsWith(l)) ? '' : 's'}\``} **Battle Pass Levels**\n\n${Object.entries(levels)
		.sort()
		.map(([k, v]) => {
			return `Season ${k.match(/\d+/)![0]}: ${Math.floor(v / 100)}`;
		})
		.join('\n')}`;
};

const handleError = (e: unknown) => {
	if (e instanceof FortniteAPIError) {
		switch (e.code) {
			case 403: {
				return 'This account\'s stats are private. If this is your account, go into Fortnite => Settings => Account and Privacy => Show on Career Leaderboard => On.';
			}
			case 404: {
				return 'No account was found with that username on that platform.';
			}
		}
	}
	console.error(e);
	return e instanceof EpicError ? e.message : 'There was an error while fetching the account.';
};

export default new SlashCommand({
	name: 'levels',
	description: 'Display a Fortnite player\'s Battle Pass levels since Chapter 2, Season 1',
	options: [
		{
			name: 'player',
			description: 'The player\'s username; defaults to your linked account, if any',
			type: ApplicationCommandOptionType.String
		},
		{
			name: 'platform',
			description: 'The player\'s platform; defaults to Epic',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'Epic', value: 'epic' },
				{ name: 'Xbox', value: 'xbl' },
				{ name: 'PlayStation', value: 'psn' }
			]
		},
		{
			name: 'link',
			description: 'Whether to link this player\'s account with the bot; defaults to false',
			type: ApplicationCommandOptionType.Boolean
		}
	],
	scope: 'Global',
	async execute(interaction) {
		const accountName = interaction.options.getString('player');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as 'epic' | 'xbl' | 'psn';

		if (accountName === null) {
			const user = await users.findById(interaction.user.id);
			if (user === null || user.epicAccountId === null) {
				await interaction.reply({ content: `No player username was provided, and you have not linked your account with ${interaction.client.user!.username}.`, ephemeral: true });
				return;
			}

			try {
				const levels = await getLevels(user.epicAccountId);
				await interaction.reply(formatLevels(levels));
			}
			catch (error) {
				await interaction.reply({ content: handleError(error), ephemeral: true });
			}
		}
		else {
			try {
				const { account } = await fortniteAPI.stats({ name: accountName, accountType });
				const levels = await getLevels(account.id);
				await interaction.reply(formatLevels(levels, account.name));

				if (interaction.options.getBoolean('link')) {
					await users.findByIdAndUpdate(interaction.user.id, { epicAccountId: account.id }, { upsert: true });
					await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, ephemeral: true });
				}
			}
			catch (error) {
				await interaction.reply({ content: handleError(error), ephemeral: true });
			}
		}
	}
});