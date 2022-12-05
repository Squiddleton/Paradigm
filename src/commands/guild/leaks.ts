import { SlashCommand } from '@squiddleton/discordjs-util';
import { ApplicationCommandOptionType, Snowflake } from 'discord.js';
import { DiscordIds } from '../../util/constants';

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
		const channelIds: Snowflake[] = [DiscordIds.ChannelId.BRLeaks, DiscordIds.ChannelId.RegularApplications, DiscordIds.ChannelId.SaltySprings, DiscordIds.ChannelId.StickerEmojiSubmissions, DiscordIds.ChannelId.STWCreativeLeaks];
		if (channelIds.includes(interaction.channelId)) {
			await interaction.reply({ content: 'This command cannot be used in this channel.', ephemeral: true });
			return;
		}

		const messages = {
			[DiscordIds.ChannelId.LeaksDiscussion]: `Please keep discussion related to confirmed leaks; use <#${DiscordIds.ChannelId.BRSpeculation}> for speculation, unconfirmed predictions, and other relevant, non-leak discussion.`,
			[DiscordIds.ChannelId.BRSpeculation]: `Please keep discussion related to Fortnite speculation, including if it pertains to leaks; use <#${DiscordIds.ChannelId.General}> for completely irrelevant conversations.`
		};

		const isSpecial = (channelId: Snowflake): channelId is keyof typeof messages => channelId in messages;
		const { channelId } = interaction;
		let message = isSpecial(channelId) ? messages[channelId] : `Do not post leaks outside of <#${DiscordIds.ChannelId.BRLeaks}>, <#${DiscordIds.ChannelId.STWCreativeLeaks}>, <#${DiscordIds.ChannelId.LeaksDiscussion}>, and <#${DiscordIds.ChannelId.BRSpeculation}>; posting elsewhere will result in message deletion.\nIf you cannot see these channels, get the Leaks and Datamines role by reacting to the message [here](https://discord.com/channels/486932163636232193/879930518228050010/879939613903425576 "Go to role-assignment").`;

		const user = interaction.options.getUser('member');
		if (user) message = `${user} ${message}`;

		await interaction.reply(message);
	}
});