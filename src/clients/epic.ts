import { EpicClient } from '@squiddleton/epic';
import { ChapterLengths } from '../util/constants.js';

const epicClient = new EpicClient({ seasonsLength: ChapterLengths.reduce((p, c) => p + c, 0), gameClient: 'M2Y2OWU1NmM3NjQ5NDkyYzhjYzI5ZjFhZjA4YThhMTI6YjUxZWU5Y2IxMjIzNGY1MGE2OWVmYTY3ZWY1MzgxMmU=' });

export default epicClient;