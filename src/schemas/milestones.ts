import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
	guildId: {
		type: String,
		required: true
	},
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

export default mongoose.model('milestones', milestoneSchema);