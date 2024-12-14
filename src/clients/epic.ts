import { EpicClient } from '@squiddleton/epic';
import { ChapterLengths } from '../util/constants.js';

const epicClient = new EpicClient({ seasonsLength: ChapterLengths.reduce((p, c) => p + c, 0) });

export default epicClient;