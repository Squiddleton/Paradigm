import { Client as ImgurClient } from '@rmp135/imgur';
import config from '../config.js';

const imgur = new ImgurClient(config.imgurClientId);
export default imgur;