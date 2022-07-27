import { ApplicationCommandOptionType, Formatters } from 'discord.js';
import { inspect } from 'util';
import { Scope, SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'eval',
	description: 'Evaluate code',
	options: [
		{
			name: 'code',
			type: ApplicationCommandOptionType.String,
			description: 'Code to evaluate',
			required: true
		}
	],
	scope: Scope.Dev,
	async execute(interaction, client) {
		const code = interaction.options.getString('code', true);
		const { owner } = client.application;
		if (owner === null) throw new Error('ClientApplication#owner unexpectedly returned null');

		if (interaction.user.id !== owner.id) {
			await interaction.reply({ content: 'Only the owner may use this command', ephemeral: true });
			await client.devChannel.send(`${interaction.user} used the eval slash command with the argument "${code}" in ${interaction.channel} at <t:${Math.floor(Date.now() / 1000)}>`);
			return;
		}

		await interaction.deferReply();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const clean = (text: any) => (typeof (text) === 'string') ? text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)) : text;

		try {
			let evaled = await eval(code);
			if (typeof evaled === 'string' && evaled.length > 0) {
				await interaction.editReply(evaled.slice(0, 2000));
				return;
			}

			const isJSON = evaled !== null && evaled?.constructor.name === 'Object';
			if (isJSON) evaled = JSON.stringify(evaled, null, 2);
			if (typeof evaled !== 'string') evaled = inspect(evaled);

			await interaction.editReply(Formatters.codeBlock(isJSON ? 'json' : 'js', clean(evaled).slice(0, 1987)));
		}
		catch (error) {
			await interaction.editReply(`\`ERROR\` ${Formatters.codeBlock('xl', clean(error))}`);
		}
	}
});