import { ClientEvent } from '@squiddleton/discordjs-util';
import { handleReaction } from '../util/functions';

export default new ClientEvent({
	name: 'messageReactionAdd',
	async execute(reaction, user) {
		await handleReaction(reaction, user, true);
	}
});