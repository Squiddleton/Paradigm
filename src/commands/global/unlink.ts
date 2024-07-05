import { SlashCommand } from '@squiddleton/discordjs-util';
import { chatInputApplicationCommandMention } from 'discord.js';
import { DiscordIds } from '../../util/constants.js';
import { getUser, saveUser } from '../../util/users.js';

export default new SlashCommand({
	name: 'unlink',
	description: 'Unlink your Epic Games account from the bot',
	scope: 'Global',
	async execute(interaction) {
		const userResult = getUser(interaction.user.id);
		if (!userResult?.epicAccountId) {
			await interaction.reply({ content: `You have not linked your account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`, ephemeral: true });
		}
		else {
			userResult.epicAccountId = null;
			await saveUser(userResult);
			await interaction.reply({ content: 'You have unlinked your account.', ephemeral: true });
		}
	}
});