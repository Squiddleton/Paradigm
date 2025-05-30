import { Schema, model } from 'mongoose';
import type { IBonusRole, IGiveaway, IGuild, IMilestone } from '../util/types.js';

const bonusRoleSchema = new Schema<IBonusRole>({
	id: {
		type: String,
		required: true
	},
	amount: {
		type: Number,
		required: true
	}
});

const giveawaySchema = new Schema<IGiveaway>({
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

const milestoneSchema = new Schema<IMilestone>({
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

const guildSchema = new Schema<IGuild>({
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
	shopChannelId: {
		type: String,
		default: null
	},
	shopSectionsChannelId: {
		type: String,
		default: null
	},
	wishlistChannelId: {
		type: String,
		default: null
	}
});

const guildModel = model<IGuild>('guilds', guildSchema);
export default guildModel;