import { ContextMenu, evalCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandType } from 'discord.js';

export default new ContextMenu({
	name: 'Eval',
	type: ApplicationCommandType.Message,
	scope: 'Dev',
	async execute(interaction) {
		await evalCommand(interaction, interaction.targetMessage.content, true);
	}
});