import { SlashCommand } from '@squiddleton/discordjs-util';
import userModel from '../../models/users.js';

export default new SlashCommand({
	name: 'unlink',
	description: 'Unlink your Epic Games account from the bot',
	scope: 'Global',
	async execute(interaction) {
		const user = await userModel.findById(interaction.user.id);
		if (user === null || user.epicAccountId === null) {
			await interaction.reply({ content: 'You have not linked your account with </link:1032454252024565821>.', ephemeral: true });
		}
		else {
			user.epicAccountId = null;
			await user.save();
			await interaction.reply({ content: 'You have unlinked your account.', ephemeral: true });
		}
	}
});