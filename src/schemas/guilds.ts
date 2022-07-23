import mongoose from 'mongoose';

export interface IGiveaway {
	messageId: string;
	channelId: string;
	startTime: number;
	endTime: number;
	completed: boolean;
	messages: number;
	regEntries: number;
	boosterEntries: number;
	winnerNumber: number;
	entrants: string[];
	winners: string[];
}

interface IMilestone {
	name: string;
	description: string;
	rarity: string;
}

interface IGuild {
	_id: string;
	giveaways: IGiveaway[];
	milestones: IMilestone[];
}

const giveawaySchema = new mongoose.Schema<IGiveaway>({
	messageId: {
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
	winners: [String]
});

const milestoneSchema = new mongoose.Schema<IMilestone>({
	name: {
		type: String,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	rarity: {
		type: String,
		required: true
	}
});

const guildSchema = new mongoose.Schema<IGuild>({
	_id: {
		type: String,
		required: true
	},
	giveaways: [giveawaySchema],
	milestones: [milestoneSchema]
});

export default mongoose.model('guilds', guildSchema);