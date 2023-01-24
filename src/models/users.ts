import { Schema, model } from 'mongoose';
import type { IUser } from '../util/types';

const userSchema = new Schema<IUser>({
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

const userModel = model<IUser>('users', userSchema);
export default userModel;