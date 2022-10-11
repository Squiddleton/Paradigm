import { ApplicationCommandOptionType } from 'discord.js';
import { SlashCommand } from '@squiddleton/discordjs-util';

export default new SlashCommand({
	name: 'leaks',
	description: 'Enforce correct channel usage in and out of leak channels',
	options: [
		{
			name: 'member',
			description: 'A member to mention in the command',
			type: ApplicationCommandOptionType.User
		}
	],
	scope: 'Exclusive',
	async execute(interaction) {
		if (['886083204690370630', '488988723049136133', '895024792439251064', '509930374021775394', '740607796898168913'].includes(interaction.channelId)) {
			await interaction.reply({ content: 'This command cannot be used in this channel.', ephemeral: true });
			return;
		}

		const messages = {
			'509936143169748992': 'Please keep discussion related to confirmed leaks; use <#785210975733284915> for speculation, unconfirmed predictions, and other relevant, non-leak discussion.',
			'785210975733284915': 'Please keep discussion related to Fortnite speculation, including if it pertains to leaks; use <#488040333310164992> for completely irrelevant conversations.'
		};

		const isSpecial = (channelId: string): channelId is keyof typeof messages => channelId in messages;
		const { channelId } = interaction;
		let message = isSpecial(channelId) ? messages[channelId] : 'Do not post leaks outside of <#509930374021775394>, <#740607796898168913>, <#509936143169748992>, and <#785210975733284915>; posting elsewhere will result in message deletion.\nIf you cannot see these channels, get the Leaks and Datamines role by reacting to the message [here](https://discord.com/channels/486932163636232193/879930518228050010/879939613903425576 "Go to role-assignment").';

		const user = interaction.options.getUser('member');
		if (user) message = `${user} ${message}`;

		await interaction.reply(message);
	}
});