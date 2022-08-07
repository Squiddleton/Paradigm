import { ApplicationCommandType } from 'discord.js';
import { ContextMenu, Scope } from '../../types/types.js';
import { evalCommand } from '../../util/functions.js';

export default new ContextMenu({
	name: 'Eval',
	type: ApplicationCommandType.Message,
	scope: Scope.Dev,
	async execute(interaction, client) {
		await evalCommand(interaction, client, interaction.targetMessage.content, true);
	}
});