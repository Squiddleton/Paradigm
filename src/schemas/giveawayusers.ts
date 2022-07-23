import { Snowflake } from 'discord.js';
import mongoose from 'mongoose';

export interface IMessage {
	day: number;
	msgs: number;
}

export interface IUser {
	userId: Snowflake;
	guildId: Snowflake;
	messages: IMessage[];
}

const msgSchema = new mongoose.Schema<IMessage>({
	day: {
		type: Number,
		required: true
	},
	msgs: {
		type: Number,
		required: true
	}
});

const giveawayUsersSchema = new mongoose.Schema<IUser>({
	userId: {
		type: String,
		required: true
	},
	guildId: {
		type: String,
		required: true
	},
	messages: [msgSchema]
});

export default mongoose.model('giveawayusers', giveawayUsersSchema);