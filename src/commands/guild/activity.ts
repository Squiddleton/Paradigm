import { SlashCommand } from '@squiddleton/discordjs-util';
import { formatPlural } from '@squiddleton/util';
import { ApplicationCommandOptionType } from 'discord.js';
import memberSchema from '../../schemas/members.js';
import { sumMessages } from '../../util/functions.js';
import type { IMessage } from '../../util/types.js';

export default new SlashCommand({
	name: 'activity',
	description: 'Rank server members by their activity',
	options: [
		{
			name: 'time',
			description: 'The interval to measure activity from',
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
			description: 'The maximum amount of members to display',
			type: ApplicationCommandOptionType.Integer,
			minValue: 1,
			maxValue: 25
		}
	],
	scope: 'Exclusive',
	async execute(interaction, client) {
		await interaction.deferReply();

		const time = interaction.options.getInteger('time', true);
		const max = interaction.options.getInteger('max') ?? 10;
		const memberResults = await memberSchema.find();

		const combineMessages = (messages: IMessage[]) => sumMessages(messages.filter(m => (31 - m.day) <= time));

		const sortedResults = memberResults.sort((a, b) => combineMessages(b.dailyMessages) - combineMessages(a.dailyMessages));
		const users = await Promise.all(sortedResults.slice(0, max).map(r => client.users.fetch(r.userId)));
		const mapped = users.map(u => `${u.tag} (${u.id})`);

		await interaction.editReply(`${max === 1 ? 'Most active user' : `Top ${max} most active users`} over the past${time === 1 ? '' : ` ${time}`} ${formatPlural('day', time)}:\n${mapped.join('\n')}`);
	}
});