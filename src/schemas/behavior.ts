import mongoose from 'mongoose';

const behaviorSchema = new mongoose.Schema({
	_id: {
		type: String,
		required: true
	},
	behaviors: {
		type: [mongoose.Schema.Types.Mixed],
		required: true,
		default: [{}]
	},
	date: {
		type: Number,
		required: true,
		default: () => new Date().getDate()
	}
});

export default mongoose.model('behavior', behaviorSchema);