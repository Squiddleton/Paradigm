import { Schema, model } from 'mongoose';

const userSchema = new Schema({
	_id: {
		type: String,
		required: true
	},
	epicAccountId: {
		type: String,
		default: null
	},
	wishlistCosmeticIds: {
		type: [String],
		required: true,
		default: []
	}
});

export default model('users', userSchema);