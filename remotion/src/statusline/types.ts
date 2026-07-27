export type SegmentId = 'dir' | 'model' | 'ctx' | 'five' | 'week' | 'fable';

export type Part =
  | {kind: 'text'; text: string; color: string}
  | {kind: 'bar'; pct: number; width: number; color: string}
  | {kind: 'stacked'; usage: number; elapsed: number; width: number; color: string};

export type Segment = {
  id: SegmentId;
  parts: Part[];
  /** Total width in terminal cells. */
  cells: number;
};

/** A limit window: usage, how far into the window we are, and the countdown. */
export type LimitWindow = {
  pct: number;
  /** 0–100, how much of the window has elapsed. Omit for a plain (unstacked) bar. */
  elapsed?: number;
  /** Seconds until the window resets. Omit to hide the ↻ countdown. */
  resetsIn?: number;
};

/**
 * Everything the statusline can show. Every field is optional the same way the
 * script's segments are conditional — omit one and the segment disappears,
 * separators included.
 */
export type StatuslineState = {
  dir?: string;
  branch?: string;
  model?: string;
  ctx?: number;
  /** Raw context tokens. The segment prints them in thousands. Omit to hide. */
  ctxTokens?: number;
  five?: LimitWindow;
  week?: LimitWindow;
  fable?: LimitWindow;
};
