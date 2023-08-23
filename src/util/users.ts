import type { Snowflake } from 'discord.js';
import type { HydratedDocument } from 'mongoose';
import type { IUser } from './types.js';
import userModel from '../models/users.js';

const cachedUsers = new Map<Snowflake, HydratedDocument<IUser>>();

const updateUserCache = (user: HydratedDocument<IUser>) => cachedUsers.set(user._id, user);

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
	users.forEach(user => updateUserCache(user));
};

export const removeFromWishlist = async (userId: Snowflake, cosmeticId: string) => {
	const user = await userModel.findByIdAndUpdate(
		userId,
		{ $pull: { wishlistCosmeticIds: cosmeticId } },
		{ new: true, upsert: true }
	);
	updateUserCache(user);
};

export const saveUser = async (user: HydratedDocument<IUser>) => {
	await user.save();
	updateUserCache(user);
};

export const setEpicAccount = async (userId: Snowflake, epicAccountId: string) => {
	const user = await userModel.findByIdAndUpdate(userId, { epicAccountId }, { new: true, upsert: true });
	updateUserCache(user);
};