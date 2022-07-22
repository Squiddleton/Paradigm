import mongoose from 'mongoose';

const msgSchema = new mongoose.Schema({
	day: {
		type: Number,
		required: true
	},
	msgs: {
		type: Number,
		required: true
	}
});

const giveawayUsersSchema = new mongoose.Schema({
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