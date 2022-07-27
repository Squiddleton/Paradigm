import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
	_id: {
		type: String,
		required: true
	},
	wishlistCosmeticIds: {
		type: [String],
		required: true,
		default: []
	}
});

export default mongoose.model('users', userSchema);