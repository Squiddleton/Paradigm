import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
	_id: {
		type: String,
		required: true
	},
	cosmeticIds: {
		type: [String],
		required: true
	}
});

export default mongoose.model('wishlists', wishlistSchema);