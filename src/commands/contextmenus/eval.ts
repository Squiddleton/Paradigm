import { ApplicationCommandType, Formatters } from 'discord.js';
import { inspect } from 'util';
import { ContextMenu, Scope } from '../../types/types.js';

export default new ContextMenu({
	name: 'Eval',
	type: ApplicationCommandType.Message,
	scope: Scope.Dev,
	async execute(interaction, client) {
		const code = interaction.targetMessage.content;

		if (interaction.user.id !== client.application.owner?.id) {
			await interaction.reply({ content: 'Only the owner may use this command', ephemeral: true });
			await client.devChannel.send(`${interaction.user} used the eval context menu with the argument "${code}" in ${interaction.channel} at <t:${Math.floor(Date.now() / 1000)}>`);
			return;
		}

		await interaction.deferReply();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const clean = (text: any) => (typeof text === 'string') ? text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)) : text;

		try {
			let evaled = await eval(`(async () => {${code}})();`);
			if (typeof evaled === 'string' && evaled.length > 0) {
				await interaction.editReply(evaled.slice(0, 2000));
				return;
			}

			const isJSON = evaled !== null && evaled?.constructor.name === 'Object';
			if (isJSON) evaled = JSON.stringify(evaled, null, 2);
			if (typeof evaled !== 'string') evaled = inspect(evaled);

			const cleaned = clean(evaled);
			if (cleaned === 'undefined') {
				await interaction.editReply('No returned output to print.');
				return;
			}

			await interaction.editReply(Formatters.codeBlock(isJSON ? 'json' : 'js', cleaned.slice(0, 1987)));
		}
		catch (error) {
			await interaction.editReply(`\`ERROR\` ${Formatters.codeBlock('xl', clean(error))}`);
		}
	}
});