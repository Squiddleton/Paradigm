import { FortniteAPIError } from '@squiddleton/fortnite-api';
import { ApplicationCommandOptionType, ChatInputCommandInteraction } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import users from '../../schemas/users.js';
import { SlashCommand } from '@squiddleton/discordjs-util';

const handleError = async (interaction: ChatInputCommandInteraction, error: unknown) => {
	if (!(error instanceof FortniteAPIError)) throw error;
	switch (error.code) {
		case 403: {
			await interaction.editReply('This account\'s stats are private. If this is your account, go into Fortnite => Settings => Account and Privacy => Show on Career Leaderboard => On.');
			break;
		}
		case 404: {
			await interaction.editReply('No account was found with that username on that platform.');
			break;
		}
	}
};

export default new SlashCommand({
	name: 'stats',
	description: 'Display a Fortnite player\'s stats',
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
			name: 'input',
			description: 'The control input whose stats to display; defaults to All',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'All', value: 'all' },
				{ name: 'Keyboard and Mouse', value: 'keyboardMouse' },
				{ name: 'Controller', value: 'gamepad' },
				{ name: 'Touch', value: 'touch' }
			]
		},
		{
			name: 'timewindow',
			description: 'The window of time to view stats during; defaults to Lifetime',
			type: ApplicationCommandOptionType.String,
			choices: [
				{ name: 'Lifetime', value: 'lifetime' },
				{ name: 'Season', value: 'season' }
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
		await interaction.deferReply();
		const accountName = interaction.options.getString('player');
		const accountType = (interaction.options.getString('platform') ?? 'epic') as 'epic' | 'xbl' | 'psn';
		const input = (interaction.options.getString('input') ?? 'all') as 'all' | 'keyboardMouse' | 'gamepad' | 'touch';
		const timeWindow = (interaction.options.getString('timewindow') ?? 'lifetime') as 'lifetime' | 'season';

		if (accountName === null) {
			const user = await users.findById(interaction.user.id);
			if (user === null || user.epicAccountId === null) {
				await interaction.editReply(`No player username was provided, and you have not linked your account with ${interaction.client.user!.username}.`);
				return;
			}

			try {
				const { image } = await fortniteAPI.stats({ id: user.epicAccountId, image: input, timeWindow });
				await interaction.editReply({ files: [image] });
			}
			catch (error) {
				await handleError(interaction, error);
			}
		}
		else {
			try {
				const { image, account } = await fortniteAPI.stats({ name: accountName, accountType, image: input, timeWindow });
				await interaction.editReply({ files: [image] });

				if (interaction.options.getBoolean('link')) {
					await users.findByIdAndUpdate(interaction.user.id, { epicAccountId: account.id }, { upsert: true });
					await interaction.followUp({ content: `Your account has been linked with \`${account.name}\`.`, ephemeral: true });
				}
			}
			catch (error) {
				await handleError(interaction, error);
			}
		}
	}
});