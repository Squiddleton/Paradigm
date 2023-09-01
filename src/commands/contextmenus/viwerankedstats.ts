import { ContextMenu } from '@squiddleton/discordjs-util';
import type { Stats } from '@squiddleton/fortnite-api';
import { ApplicationCommandType, chatInputApplicationCommandMention } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { createRankedImage, handleStatsError } from '../../util/fortnite.js';
import { getUser } from '../../util/users.js';

export default new ContextMenu({
	name: 'View Ranked Stats',
	type: ApplicationCommandType.User,
	scope: 'Global',
	async execute(interaction) {
		const userResult = getUser(interaction.targetUser.id);
		if (userResult === null || userResult.epicAccountId === null) {
			await interaction.reply({ content: `The target user has not yet linked their account with ${chatInputApplicationCommandMention('link', '1032454252024565821')}.`, ephemeral: true });
			return;
		}

		await interaction.deferReply();
		let stats: Stats<false>;
		try {
			stats = await fortniteAPI.stats({ id: userResult.epicAccountId });
		}
		catch (error) {
			await handleStatsError(interaction, error);
			return;
		}

		const buffer = await createRankedImage(stats.account, true);
		await interaction.editReply({ files: [buffer] });
	}
});