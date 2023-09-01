import { SlashCommand } from '@squiddleton/discordjs-util';
import { chatInputApplicationCommandMention } from 'discord.js';
import { getUser, saveUser } from '../../util/users.js';

export default new SlashCommand({
	name: 'unlink',
	description: 'Unlink your Epic Games account from the bot',
	scope: 'Global',
	async execute(interaction) {
		const user = getUser(interaction.user.id);
		if (user === null || user.epicAccountId === null) {
			await interaction.reply({ content: `You have not linked your account with ${chatInputApplicationCommandMention('link', '1032454252024565821')}.`, ephemeral: true });
		}
		else {
			user.epicAccountId = null;
			await saveUser(user);
			await interaction.reply({ content: 'You have unlinked your account.', ephemeral: true });
		}
	}
});