import { ApplicationCommandOptionType } from 'discord.js';
import giveawayUserSchema from '../../schemas/giveawayusers.js';
import { SlashCommand } from '../../types/types.js';

export default new SlashCommand({
	name: 'activity',
	description: 'Rank server members by their activity',
	options: [
		{
			name: 'time',
			description: 'The timeframe to begin measuring activity from',
			type: ApplicationCommandOptionType.Integer,
			required: true,
			choices: [
				{ name: '1 month', value: 30 },
				{ name: '3 weeks', value: 21 },
				{ name: '2 weeks', value: 14 },
				{ name: '1 week', value: 7 },
				{ name: '1 day', value: 1 }
			]
		},
		{
			name: 'max',
			description: 'The maximum amount of members to show',
			type: ApplicationCommandOptionType.Integer,
			minValue: 1,
			maxValue: 25
		}
	],
	global: false,
	async execute(interaction, client) {
		await interaction.deferReply();

		const time = interaction.options.getInteger('time') ?? 30;
		const max = interaction.options.getInteger('max') ?? 10;
		const messages = await giveawayUserSchema.find();

		const combineMsgs = (msgs: { day: number; msgs: number }[]): number => msgs
			.filter(m => (31 - m.day) <= time)
			.reduce((acc, msg) => acc + msg.msgs, 0);

		const sorted = messages.sort((a, b) => combineMsgs(b.messages) - combineMsgs(a.messages));
		const users = await Promise.all(sorted.slice(0, max).map(m => client.users.fetch(m.userId)));
		const mapped = users.map(user => `${user.tag} (${user.id})`);

		await interaction.editReply(`${max === 1 ? 'Most active user' : `Top ${max} most active users`} over the past${time === 1 ? '' : ` ${time}`} day${time === 1 ? '' : 's'}:\n${mapped.join('\n')}`);
		return;
	}
});