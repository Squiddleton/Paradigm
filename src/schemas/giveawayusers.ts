import mongoose from 'mongoose';
import type { IMessage, IUser } from '../types.js';

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
	messages: {
		type: [msgSchema],
		required: true,
		default: [{ day: 30, msgs: 0 }]
	}
});

export default mongoose.model('giveawayusers', giveawayUsersSchema);