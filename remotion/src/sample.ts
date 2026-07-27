import type {StatuslineState} from './statusline/types';

/** The line as it looks on this repo — the baseline every loop starts from. */
export const SAMPLE_STATE: StatuslineState = {
  dir: 'claude-statusline',
  branch: 'main',
  model: 'Opus 4.8',
  ctx: 19,
  ctxTokens: 38000,
  five: {pct: 12, elapsed: 22, resetsIn: 3 * 3600 + 40 * 60},
  week: {pct: 16, elapsed: 48, resetsIn: 3 * 86400 + 10 * 3600},
  fable: {pct: 7, elapsed: 48},
};
