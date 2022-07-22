import mongoose from 'mongoose';

const giveawaySchema = new mongoose.Schema({
	_id: {
		type: String,
		required: true
	},
	guildId: {
		type: String,
		required: true
	},
	channelId: {
		type: String,
		required: true
	},
	startTime: {
		type: Number,
		required: true
	},
	endTime: {
		type: Number,
		required: true
	},
	completed: {
		type: Boolean,
		required: true
	},
	messages: {
		type: Number,
		required: true
	},
	regEntries: {
		type: Number,
		required: true
	},
	boosterEntries: {
		type: Number,
		required: true
	},
	winnerNumber: {
		type: Number,
		required: true
	},
	entrants: [String],
	winners: [String],
	allowMods: {
		type: Boolean,
		required: true
	}
});

export default mongoose.model('giveaways', giveawaySchema);