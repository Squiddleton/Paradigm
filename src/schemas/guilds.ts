import mongoose from 'mongoose';
import type { IBonusRole, IGiveaway, IGuild, IMilestone } from '../util/types.js';

const bonusRoleSchema = new mongoose.Schema<IBonusRole>({
	id: {
		type: String,
		required: true
	},
	amount: {
		type: Number,
		required: true
	}
});

const giveawaySchema = new mongoose.Schema<IGiveaway>({
	messageId: {
		type: String,
		required: true
	},
	channelId: {
		type: String,
		required: true
	},
	text: {
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
	bonusRoles: {
		type: [bonusRoleSchema],
		default: []
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
	giveaways: {
		type: [giveawaySchema],
		required: true,
		default: []
	},
	milestones: {
		type: [milestoneSchema],
		required: true,
		default: []
	},
	wishlistChannelId: {
		type: String,
		default: null
	}
});

export default mongoose.model('guilds', guildSchema);