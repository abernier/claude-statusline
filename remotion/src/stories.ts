// The five loops. Ported straight from the landing-page prototype (ticket #4),
// which is where these arcs were settled with the human — the page drives the
// same numbers from JS, so keeping the two in step is what stops the rendered
// media from disagreeing with the live statusline docked below it.

import type {SegmentId, StatuslineState} from './statusline/types';

/** Window lengths in seconds, as statusline.sh uses them. */
export const FIVE_WINDOW = 5 * 3600;
export const WEEK_WINDOW = 7 * 86400;

const easeIn = (p: number): number => p * p;
const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);
const linear = (p: number): number => p;

/**
 * Ramp 0→peak by `drain`, then fall straight back to 0 by p=1. The point is
 * that start == end == 0: every story built on this loops without a seam, which
 * is the one hard requirement on all five.
 */
const cyc = (
  p: number,
  peak: number,
  drain = 0.9,
  ease: (p: number) => number = linear
): number =>
  p < drain ? peak * ease(p / drain) : peak * (1 - (p - drain) / (1 - drain));

/**
 * A window's countdown is not free-running — it is a reading of how far into the
 * window we are, so it has to be derived from `elapsed` or the bar and the `↻`
 * drift apart.
 */
export const remaining = (
  elapsedPct: number,
  windowSeconds: number
): number => Math.max(0, (1 - elapsedPct / 100) * windowSeconds);

/**
 * Where the 7-day window starts every loop: just past halfway, which is what
 * puts its countdown at `↻3d10h`. The Fable window resets with the 7-day one,
 * so this one reading is the blue half of *both* bars — never two numbers.
 */
export const WEEK_ELAPSED = 51;

/**
 * The token count is not a free variable either — it is the same reading as the
 * context percentage, so it is derived from it against a 1M window, which is
 * what every current Claude model has. The percentage is rounded first, because
 * that is the number printed beside it: 38% has to read as 380k, not 379k.
 */
const CTX_WINDOW = 1000000;
export const ctxTokens = (pct: number): number =>
  Math.round((Math.round(pct) / 100) * CTX_WINDOW);

export type Story = {
  id: string;
  /** Filename stem for the rendered asset. */
  slug: string;
  /** One line on what the loop shows — the render script logs it. */
  summary: string;
  /** Stacked bars that glow where usage overshoots the clock. */
  glow?: SegmentId[];
  /** The line at loop progress p ∈ [0,1). */
  at: (p: number) => StatuslineState;
};

/**
 * 01 — usage ramps past the blue clock and the overshoot glows.
 *
 * The arcs are tuned so the *crossing* is the event: the clock leads for the
 * first ~60% of the loop (nothing wrong yet), usage crosses it, then runs away
 * to a four-cell overshoot. The prototype's original pair (`100q²` against
 * `88q`) crossed only at p≈0.79 and peaked one cell clear, so the thing this
 * loop exists to show was on screen for under a second in eight.
 */
const burn: Story = {
  id: 'burn',
  slug: 'loop-burn',
  summary: 'usage overtaking the blue clock, overshoot glowing',
  glow: ['five'],
  at: (p) => {
    // The clock opens quickly and flattens; usage starts gently and accelerates.
    const elapsed = cyc(p, 62, 0.9, easeOut);
    return {
      five: {
        pct: cyc(p, 100, 0.9, (q) => q ** 1.5),
        elapsed,
        resetsIn: remaining(elapsed, FIVE_WINDOW),
      },
    };
  },
};

/**
 * 02 — the context window fills to ~78%, then compacts back down.
 *
 * Compaction does not empty the window — it leaves a summary behind, so the arc
 * runs between 6% and 78% rather than 0% and 78%. A 0% frame would also drop the
 * token count (the script hides it at zero) and shorten the segment mid-loop.
 */
const CTX_FLOOR = 6;

const context: Story = {
  id: 'context',
  slug: 'loop-context',
  summary: 'context filling to 78%, then compacting back to the summary',
  at: (p) => {
    const ctx = CTX_FLOOR + cyc(p, 78 - CTX_FLOOR, 0.92, easeOut);
    return {ctx, ctxTokens: ctxTokens(ctx)};
  },
};

/**
 * 03 — the reset. Creeps up a few points over most of the loop, drops to zero
 * *instantly* (no ramp — that is the whole point of the shot), holds a beat,
 * then climbs back to where it started.
 */
const reset: Story = {
  id: 'reset',
  slug: 'loop-reset',
  summary: 'slow creep, instant drop to zero, quick climb back',
  at: (p) => {
    let pct: number;
    let elapsed: number;
    if (p < 0.8) {
      const q = p / 0.8;
      pct = 84 + 8 * q;
      elapsed = 94 + 6 * q;
    } else {
      const q = (p - 0.8) / 0.2;
      if (q < 0.14) {
        // The drop, held just long enough to read as an event.
        pct = 0;
        elapsed = 0;
      } else {
        const r = (q - 0.14) / 0.86;
        pct = 84 * r;
        elapsed = 94 * r;
      }
    }
    return {
      five: {pct, elapsed, resetsIn: remaining(elapsed, FIVE_WINDOW)},
    };
  },
};

/**
 * 04 — the Fable weekly quota, spent long before the week is over.
 *
 * Usage runs to 100% in the first half of the loop and then just sits there:
 * nothing gives the quota back except the weekly reset, so the only thing still
 * moving is the blue clock, which runs the whole way to the end of the window.
 * At the reset both drop to zero — which is where the loop starts, so the seam
 * *is* the reset rather than a rewind.
 */
/** Loop progress at which the weekly window turns over. */
const FABLE_RESET_AT = 0.9;
/** Loop progress at which the quota is spent. */
const FABLE_SPENT_AT = 0.42;

/**
 * The blue half of the Fable bar is the 7-day clock, so the page drives its
 * docked `7d` segment from this same reading — one clock, two bars in step.
 */
const fableWeekElapsed = (p: number): number =>
  p >= FABLE_RESET_AT ? 0 : (p / FABLE_RESET_AT) * 100;

const fable: Story = {
  id: 'fable',
  slug: 'loop-fable',
  summary: 'Fable quota spent early, then waiting out the week for the reset',
  at: (p) => {
    const elapsed = fableWeekElapsed(p);
    const pct =
      p >= FABLE_RESET_AT ? 0 : 100 * easeOut(Math.min(1, p / FABLE_SPENT_AT));
    // No resetsIn: the Fable segment prints no countdown, because its window
    // resets with the 7-day one.
    return {fable: {pct, elapsed}};
  },
};

/** 05 — the line from `Ctx` rightward, every window alive at once. */
const wholeLine: Story = {
  id: 'whole-line',
  slug: 'loop-whole-line',
  summary: 'the whole line from Ctx rightward, all four windows moving',
  at: (p) => {
    // One wall clock drives every blue half. The loop is a time-lapse of 3.6
    // hours — 72% of a 5-hour window, and 2.1 points of a 7-day one — so the
    // three clocks advance by the same real time rather than at three rates.
    const fiveElapsed = cyc(p, 72, 0.95);
    const weekElapsed =
      WEEK_ELAPSED + (fiveElapsed * FIVE_WINDOW) / WEEK_WINDOW;
    const ctx = CTX_FLOOR + cyc(p, 52, 0.95);
    return {
      ctx,
      ctxTokens: ctxTokens(ctx),
      five: {
        pct: cyc(p, 64, 0.95, easeIn),
        elapsed: fiveElapsed,
        resetsIn: remaining(fiveElapsed, FIVE_WINDOW),
      },
      week: {
        pct: 12 + cyc(p, 10, 0.95),
        elapsed: weekElapsed,
        resetsIn: remaining(weekElapsed, WEEK_WINDOW),
      },
      // The Fable window resets with the 7-day one, so it reads the same clock.
      fable: {pct: 7 + cyc(p, 26, 0.95), elapsed: weekElapsed},
    };
  },
};

/** Walkthrough order — the same order the page's five sections run in. */
export const STORIES: Story[] = [burn, context, reset, fable, wholeLine];

export const storyById = (id: string): Story => {
  const story = STORIES.find((s) => s.id === id);
  if (!story) throw new Error(`Unknown story: ${id}`);
  return story;
};

/**
 * The frame the stills are taken on. 0.62 is the same representative frame the
 * page paints under `prefers-reduced-motion`: every bar is well into its ramp,
 * so nothing reads as empty or maxed out.
 */
export const STILL_PROGRESS = 0.62;
