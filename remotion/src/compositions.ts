// Canvas geometry for the rendered assets. Kept as data so `Root.tsx` and the
// render script agree on what exists.

import {LOOP_PADDING} from './Loop';
import {annotatedHeight} from './statusline/Annotation';
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

/** The whole line from `Ctx` rightward: 106 cells, so it needs the room. */
const WHOLE = {width: 2240, height: 180, fontSize: 32};

/** The frame `Loop` draws around the panel, on both edges of both axes. */
const FRAME = 2 * LOOP_PADDING;

export type LoopComposition = {
  /** Composition id, and the stem of the rendered file. */
  id: string;
  storyId: string;
  width: number;
  height: number;
  fontSize: number;
  /** Name the race this bar draws. */
  annotate: boolean;
};

/**
 * A loop is annotated when its story has a race to name — `burn`, `reset` and
 * `fable`, the same three crops the landing page annotates. `context` has no
 * clock to race, and `whole-line` is too dense for marks.
 *
 * An annotated loop keeps the line at `SINGLE`'s size and grows its canvas
 * instead. The marks want about 5.7 text-heights above the line and 10.8 below,
 * which the 200px canvas cannot give without shrinking the line to 23px — at
 * which point the reading the annotation exists for stops being readable.
 */
export const LOOP_COMPOSITIONS: LoopComposition[] = STORIES.map((story) => {
  const base = story.id === 'whole-line' ? WHOLE : SINGLE;
  if (!story.race) return {id: story.slug, storyId: story.id, ...base, annotate: false};
  return {
    id: story.slug,
    storyId: story.id,
    ...base,
    height:
      Math.ceil(annotatedHeight(base.fontSize, Boolean(story.race.effort))) + FRAME,
    annotate: true,
  };
});

export const SOCIAL = {
  id: 'social-preview',
  /** The size GitHub and the major card scrapers expect. */
  width: 1280,
  height: 640,
  /**
   * The largest size at which the card's 82 cells (the whole line minus the
   * Fable segment — see `dockState` in Social.tsx) still clear the frame's
   * padding: (1280 − 2×28 outer − 2×46 inline) / 82 cells / 0.6 advance ≈ 23.0.
   */
  statuslineFontSize: 23,
} as const;
