import type { Snowflake } from 'discord.js';
import type { UserDocument } from './types.js';
import userModel from '../models/users.js';

const cachedUsers = new Map<Snowflake, UserDocument>();

const updateUserCache = (user: UserDocument) => {
	cachedUsers.set(user._id, user);
};

export const addToWishlist = async (userId: Snowflake, cosmeticId: string) => {
	const user = await userModel.findByIdAndUpdate(
		userId,
		{ $addToSet: { wishlistCosmeticIds: cosmeticId } },
		{ new: true, upsert: true }
	);
	updateUserCache(user);
};

export const getUser = (userId: Snowflake) => cachedUsers.get(userId) ?? null;

export const populateUsers = async () => {
	const users = await userModel.find();
	users.forEach(updateUserCache);
};

export const removeFromWishlist = async (userId: Snowflake, cosmeticId: string) => {
	const user = await userModel.findByIdAndUpdate(
		userId,
		{ $pull: { wishlistCosmeticIds: cosmeticId } },
		{ new: true, upsert: true }
	);
	updateUserCache(user);
};

export const removeOldUsers = () => {
	cachedUsers.clear();
};

export const saveUser = async (user: UserDocument) => {
	await user.save();
	updateUserCache(user);
};

export const setEpicAccount = async (userId: Snowflake, epicAccountId: string) => {
	const user = await userModel.findByIdAndUpdate(userId, { epicAccountId }, { new: true, upsert: true });
	updateUserCache(user);
};