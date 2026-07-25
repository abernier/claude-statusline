// Canvas geometry for the rendered assets. Kept as data so `Root.tsx` and the
// render script agree on what exists.

import {STORIES} from './stories';

/**
 * 8 seconds at 15fps — the prototype's own cadence (`PERIOD = 8000`, ticker
 * throttled to ~15fps). A time-lapse wants to look stepped, not smooth, and
 * 15fps keeps the GIFs a fraction of the size a 30fps render would be.
 */
export const LOOP_FPS = 15;
export const LOOP_FRAMES = 120;

/**
 * One segment on its own. Wide enough for `Fable`, the longest of them, with
 * room left over — a GIF cropped tight to the glyphs has nowhere to breathe.
 */
const SINGLE = {width: 1000, height: 200, fontSize: 48};

/** The whole line from `Ctx` rightward: 109 cells, so it needs the room. */
const WHOLE = {width: 2240, height: 180, fontSize: 32};

export type LoopComposition = {
  /** Composition id, and the stem of the rendered file. */
  id: string;
  storyId: string;
  width: number;
  height: number;
  fontSize: number;
};

export const LOOP_COMPOSITIONS: LoopComposition[] = STORIES.map((story) => ({
  id: story.slug,
  storyId: story.id,
  ...(story.id === 'whole-line' ? WHOLE : SINGLE),
}));

export const SOCIAL = {
  id: 'social-preview',
  /** The size GitHub and the major card scrapers expect. */
  width: 1280,
  height: 640,
  /**
   * The largest size at which all 109 cells still clear the frame's padding:
   * (1280 − 2×28 outer − 2×46 inline) / 109 cells / 0.6 advance ≈ 17.3.
   */
  statuslineFontSize: 17,
} as const;
