import mongoose from 'mongoose';

const behaviorSchema = new mongoose.Schema({
	_id: {
		type: String,
		required: true
	},
	behaviors: [mongoose.Schema.Types.Mixed],
	date: {
		type: Number,
		required: true
	}
});

export default mongoose.model('behavior', behaviorSchema);