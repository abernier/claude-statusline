// The walkthrough loops. Ported straight from the landing-page prototype (ticket #4),
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

/**
 * The race a loop can have annotated: which bar carries it, and — where the loop
 * has one — the effort record drawn under it. Static, so a canvas can be sized
 * for the marks before any frame is drawn.
 */
export type Race = {
  segment: 'five' | 'week' | 'fable';
  effort?: {
    /** The clock reading at the moment the effort dropped. */
    switchAt: number;
    /** The level in force at p. Null while there is no record to draw. */
    at: (p: number) => 'high' | 'low' | null;
  };
};

export type Story = {
  id: string;
  /** Filename stem for the rendered asset. */
  slug: string;
  /** One line on what the loop shows — the render script logs it. */
  summary: string;
  /** Stacked bars that glow where usage overshoots the clock. */
  glow?: SegmentId[];
  /** The spend-against-clock race this loop can name. Omit where there is none. */
  race?: Race;
  /** The line at loop progress p ∈ [0,1). */
  at: (p: number) => StatuslineState;
};

/**
 * 01 — high effort until the spend pulls ahead of the clock, then low, and the
 * clock closes the gap back up.
 *
 * The crossing used to be the whole event. It is now the *middle* of one: the
 * loop has to show the reason to touch the effort dial and the result of
 * touching it, because that is what the page says the bar is for.
 *
 * The clock runs at a constant rate, because clocks do. Spend accelerates while
 * the effort is high, crosses it, then flattens the moment the effort drops —
 * flat enough that the clock overtakes it, so the run ends green and the loop
 * shows all three pace colours. The window turns over at the end, which is
 * what makes the loop seamless — `cyc` is not used here because this arc is
 * not a ramp-and-drain.
 *
 * These five numbers also fix where the page's effort row changes colour
 * (docs/index.html, EFFORT_SWITCH … U_END). Change one, change the other.
 */
const EFFORT_SWITCH = 0.42; // where in the loop the effort drops
const RUN_END = 0.94; // where the window turns over
const CLOCK_END = 96; // how far the clock gets before it does
const U_SWITCH = 70; // spend at the moment of the switch
const U_END = 78; // spend when the window turns over — 18 behind the clock, green

/** The clock reading at the moment the effort dropped — where the row changes colour. */
const T_SWITCH = CLOCK_END * (EFFORT_SWITCH / RUN_END);

const burn: Story = {
  id: 'burn',
  slug: 'loop-burn',
  summary: 'high effort overtaking the clock, then low effort letting it catch up',
  glow: ['five'],
  race: {
    segment: 'five',
    effort: {
      switchAt: T_SWITCH,
      // Past the turnover the window is empty, so there is no run to record.
      at: (p) => (p >= RUN_END ? null : p < EFFORT_SWITCH ? 'high' : 'low'),
    },
  },
  at: (p) => {
    if (p >= RUN_END) {
      return {five: {pct: 0, elapsed: 0, resetsIn: FIVE_WINDOW}};
    }
    const elapsed = CLOCK_END * (p / RUN_END);
    const pct =
      p < EFFORT_SWITCH
        ? U_SWITCH * (p / EFFORT_SWITCH) ** 1.4
        : U_SWITCH +
          (U_END - U_SWITCH) * ((p - EFFORT_SWITCH) / (RUN_END - EFFORT_SWITCH));
    return {five: {pct, elapsed, resetsIn: remaining(elapsed, FIVE_WINDOW)}};
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
 * 03 — the agent panel. Three subagents fill their own context windows at
 * their own pace: one finishes early and holds, one climbs into red, one
 * starts late. The batch finishes near the end and a new one starts, which is
 * what makes the loop seamless.
 *
 * The arc is ported from the page (docs/index.html, story 03) — the ramps,
 * peaks and the 0.94 turnover are the same numbers. Change one, change the
 * other. The page's story also creeps the docked line's `ctx`; the render has
 * no docked line, so only the rows are here.
 */
const AGENTS_DONE_AT = 0.94;

const agents: Story = {
  id: 'agents',
  slug: 'loop-agents',
  summary: 'three subagents, each filling its own context window',
  at: (p) => {
    const done = p >= AGENTS_DONE_AT;
    const ramp = (peak: number, from: number, to: number): number =>
      done ? 0 : peak * Math.max(0, Math.min(1, (p - from) / (to - from)));
    return {
      agents: [
        {
          name: 'Explore',
          model: 'Haiku 4.5',
          effort: 'low',
          desc: 'map the repo',
          ctx: ramp(34, 0, 0.48),
        },
        {
          name: 'verify:bugs',
          model: 'Opus 5 1M',
          effort: 'high',
          desc: 'refute the findings',
          ctx: ramp(76, 0.06, 0.9),
        },
        {
          name: 'docs',
          model: 'Sonnet 5',
          effort: 'med',
          desc: 'write the changelog',
          ctx: ramp(22, 0.42, 0.9),
        },
      ],
    };
  },
};

/**
 * 04 — the start of the line. A branch name types itself out until the folder
 * and the branch run out of budget and the ladder starts eliding, then the
 * folder changes too and the model and the effort change with it.
 *
 * Ported from the page (docs/index.html, story 04) — the cue points are the
 * same numbers. Change one, change the other. The trimming itself is not in
 * here: `fitLocation()` in segments.ts does it, the way the script does.
 */
const LONG_BRANCH = 'feature/context-window-bar-redesign';
/** Where the typing stops, the effort drops, the project changes, and the loop seams. */
const TYPED_AT = 0.46;
const SWITCH_AT = 0.76;
const START_SEAM_AT = 0.94;

const lineStart: Story = {
  id: 'line-start',
  slug: 'loop-line-start',
  summary: 'a branch name outgrowing its budget, and the model and effort changing',
  at: (p) => {
    const head = {dir: 'claude-statusline', branch: 'main', model: 'Opus 5 1M', effort: 'high'};
    if (p >= START_SEAM_AT) return head;
    if (p >= SWITCH_AT) {
      return {
        ...head,
        dir: 'acme-platform-web-frontend',
        branch: LONG_BRANCH,
        model: 'Sonnet 5',
        effort: 'med',
      };
    }
    if (p >= TYPED_AT) return {...head, branch: LONG_BRANCH, effort: 'low'};
    const typed = Math.round(4 + (LONG_BRANCH.length - 4) * (p / TYPED_AT));
    return {...head, branch: LONG_BRANCH.slice(0, Math.max(4, typed))};
  },
};

/**
 * 05 — the Fable weekly quota, spent long before the week is over.
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
  race: {segment: 'fable'},
  at: (p) => {
    const elapsed = fableWeekElapsed(p);
    const pct =
      p >= FABLE_RESET_AT ? 0 : 100 * easeOut(Math.min(1, p / FABLE_SPENT_AT));
    // No resetsIn: the Fable segment prints no countdown, because its window
    // resets with the 7-day one.
    return {fable: {pct, elapsed}};
  },
};

/** 06 — the line from `Ctx` rightward, every window alive at once. */
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

/** Walkthrough order — the same order the page's sections run in. */
export const STORIES: Story[] = [burn, context, agents, lineStart, fable, wholeLine];

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
