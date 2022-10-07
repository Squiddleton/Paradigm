import RedditClient from 'snoowrap';
import config from '../config.js';

const reddit = new RedditClient(config.snoowrap);
export default reddit;