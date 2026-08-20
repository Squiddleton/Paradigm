import { Schema, model } from 'mongoose';
import { type ISprite, type IUser } from '../util/types.js';

const reqString = {
	type: String,
	required: true
};

const spriteSchema = new Schema<ISprite>({
	name: reqString,
	variant: String,
	status: reqString
});

const userSchema = new Schema<IUser>({
	_id: reqString,
	epicAccountId: {
		type: String,
		default: null
	},
	wishlistCosmeticIds: {
		type: [String],
		required: true,
		default: []
	},
	sprites: {
		type: [spriteSchema],
		required: true,
		default: []
	}
});

const userModel = model<IUser>('users', userSchema);
export default userModel;