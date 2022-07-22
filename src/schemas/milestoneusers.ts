import mongoose from 'mongoose';

const milestoneUserSchema = new mongoose.Schema({
	userId: {
		type: String,
		required: true
	},
	guildId: {
		type: String,
		required: true
	},
	milestones: {
		type: [String],
		required: true
	}
});

export default mongoose.model('milestoneusers', milestoneUserSchema);