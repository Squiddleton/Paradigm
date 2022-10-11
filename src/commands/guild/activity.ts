import { ApplicationCommandOptionType } from 'discord.js';
import memberSchema from '../../schemas/members.js';
import { SlashCommand } from '@squiddleton/discordjs-util';
import type { IMessage } from '../../util/types.js';
import { sumMsgs } from '../../util/functions.js';

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

		const time = interaction.options.getInteger('time') ?? 30;
		const max = interaction.options.getInteger('max') ?? 10;
		const members = await memberSchema.find();

		const combineMsgs = (msgs: IMessage[]) => msgs
			.filter(m => (31 - m.day) <= time)
			.reduce(sumMsgs, 0);

		const sorted = members.sort((a, b) => combineMsgs(b.dailyMessages) - combineMsgs(a.dailyMessages));
		const users = await Promise.all(sorted.slice(0, max).map(m => client.users.fetch(m.userId)));
		const mapped = users.map(user => `${user.tag} (${user.id})`);

		await interaction.editReply(`${max === 1 ? 'Most active user' : `Top ${max} most active users`} over the past${time === 1 ? '' : ` ${time}`} day${time === 1 ? '' : 's'}:\n${mapped.join('\n')}`);
	}
});