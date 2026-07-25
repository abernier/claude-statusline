// Palette and geometry lifted straight from statusline.sh — this file is the
// single place the mockup and the real script are kept in sync.

export const colors = {
  green: 'rgb(140, 194, 74)', // 38;2;140;194;74
  yellow: 'rgb(220, 200, 60)', // 38;2;220;200;60
  red: 'rgb(220, 60, 60)', // 38;2;220;60;60
  dim: 'rgb(138, 138, 138)', // 38;2;138;138;138
  sep: 'rgb(55, 55, 55)', // 38;2;55;55;55
  track: 'rgb(55, 55, 55)', // 48;2;55;55;55
  blue: 'rgb(40, 80, 130)', // 48;2;40;80;130 — window time elapsed
  dir: 'rgb(95, 175, 215)', // 38;5;74
  background: '#0d0d0d',
} as const;

/** 5h / 7d / Fable: green < 50, yellow 50–80, red > 80. */
export const pctColor = (pct: number): string =>
  pct > 80 ? colors.red : pct >= 50 ? colors.yellow : colors.green;

/** Context: tighter thresholds — green < 25, yellow 25–49, red >= 50. */
export const ctxColor = (pct: number): string =>
  pct >= 50 ? colors.red : pct >= 25 ? colors.yellow : colors.green;

// A terminal cell. Everything on the statusline is laid out on this grid, so a
// segment's position is knowable in columns — which is what lets the camera
// zoom onto a segment without measuring the DOM.
export const metrics = {
  fontSize: 28,
  /** Advance width of one cell, as a multiple of the font size. */
  cellWidthRatio: 0.6,
  /** Line box height, as a multiple of the font size. */
  lineHeightRatio: 1.45,
} as const;

export const cellWidth = (fontSize: number = metrics.fontSize): number =>
  fontSize * metrics.cellWidthRatio;

export const lineHeight = (fontSize: number = metrics.fontSize): number =>
  fontSize * metrics.lineHeightRatio;

export {monoFontFamily as fontFamily} from './font';

// Page furniture the rendered stills share with the landing page. The statusline
// palette above belongs to statusline.sh; these belong to the design in #4.
export const page = {
  /** Claude Code clay — the brand accent, used for the mark and the mode line. */
  brand: '#D97757',
  /** The app frame. */
  app: '#161616',
  /** Anything that reads as a screen within the frame. */
  sunk: '#101010',
  fg: '#ededed',
  muted: '#8f8f8f',
  faint: '#6e6e6e',
  line: '#242424',
  hair: '#1e1e1e',
} as const;
