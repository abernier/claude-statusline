import {
  FIVE_WINDOW,
  WEEK_ELAPSED,
  WEEK_WINDOW,
  ctxTokens,
  remaining,
} from './stories';
import type {StatuslineState} from './statusline/types';

/** How far into the 5-hour window this baseline sits. */
export const SAMPLE_FIVE_ELAPSED = 22;

/**
 * The line as it looks on this repo — the baseline every loop starts from.
 * Every derived field is derived, not typed in: the countdowns come from the
 * elapsed readings, the token count from the context percentage, and the Fable
 * bar from the 7-day clock it resets with.
 */
export const SAMPLE_STATE: StatuslineState = {
  dir: 'claude-statusline',
  branch: 'main',
  model: 'Opus 5',
  ctx: 19,
  ctxTokens: ctxTokens(19),
  five: {
    pct: 12,
    elapsed: SAMPLE_FIVE_ELAPSED,
    resetsIn: remaining(SAMPLE_FIVE_ELAPSED, FIVE_WINDOW),
  },
  week: {
    pct: 16,
    elapsed: WEEK_ELAPSED,
    resetsIn: remaining(WEEK_ELAPSED, WEEK_WINDOW),
  },
  fable: {pct: 7, elapsed: WEEK_ELAPSED},
};
