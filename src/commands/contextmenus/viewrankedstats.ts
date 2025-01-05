import { ContextMenu } from '@squiddleton/discordjs-util';
import type { Stats } from '@squiddleton/fortnite-api';
import { ApplicationCommandType, chatInputApplicationCommandMention, MessageFlags } from 'discord.js';
import fortniteAPI from '../../clients/fortnite.js';
import { DiscordIds } from '../../util/constants.js';
import { handleStatsError } from '../../util/fortnite.js';
import { getUser } from '../../util/users.js';
import { createRankedImage } from '../../util/epic.js';

export default new ContextMenu({
	name: 'View Ranked Stats',
	type: ApplicationCommandType.User,
	scope: 'Global',
	async execute(interaction) {
		const userResult = getUser(interaction.targetUser.id);
		if (!userResult?.epicAccountId) {
			await interaction.reply({ content: `The target user has not yet linked their account with ${chatInputApplicationCommandMention('link', DiscordIds.CommandId.Link)}.`, flags: MessageFlags.Ephemeral });
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

		const buffer = await createRankedImage(stats.account, true, 'br');
		if (buffer === null) await interaction.editReply({ content: 'The Epic Games stats API is currently unavailable. Please try again in a few minutes.' });
		else await interaction.editReply({ files: [buffer] });
	}
});