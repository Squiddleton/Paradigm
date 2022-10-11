import mongoose from 'mongoose';
import type { IMessage } from '../types.js';

const messageSchema = new mongoose.Schema<IMessage>({
	day: {
		type: Number,
		required: true
	},
	messages: {
		type: Number,
		required: true
	}
});

const memberSchema = new mongoose.Schema({
	userId: {
		type: String,
		required: true
	},
	guildId: {
		type: String,
		required: true
	},
	dailyMessages: {
		type: [messageSchema],
		required: true,
		default: [{ day: 30, messages: 0 }]
	},
	milestones: {
		type: [String],
		required: true,
		default: []
	}
});

export default mongoose.model('members', memberSchema);