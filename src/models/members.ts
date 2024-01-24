import { Schema, model } from 'mongoose';
import type { IMember } from '../util/types.js';

const memberSchema = new Schema<IMember>({
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
		required: true,
		default: []
	}
});

const memberModel = model<IMember>('members', memberSchema);
export default memberModel;