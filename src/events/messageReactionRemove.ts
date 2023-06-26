import { ClientEvent } from '@squiddleton/discordjs-util';
import { handleReaction } from '../util/functions.js';

export default new ClientEvent({
	name: 'messageReactionRemove',
	async execute(reaction, user) {
		await handleReaction(reaction, user, false);
	}
});