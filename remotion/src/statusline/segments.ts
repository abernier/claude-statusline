import {colors, ctxColor, pctColor} from '../theme';
import type {LimitWindow, Part, Segment, StatuslineState} from './types';

/** now / 45m / 7h9m / 3d10h — mirrors fmt_reset in statusline.sh. */
export const fmtReset = (seconds: number): string => {
  const diff = Math.round(seconds);
  if (diff <= 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}m`;
  return `${Math.floor(diff / 86400)}d${Math.floor((diff % 86400) / 3600)}h`;
};

/** Width of a part in terminal cells. */
export const partCells = (part: Part): number =>
  part.kind === 'text' ? [...part.text].length : part.width;

const segment = (id: Segment['id'], parts: Part[]): Segment => ({
  id,
  parts,
  cells: parts.reduce((sum, part) => sum + partCells(part), 0),
});

/** Bar width in cells — the script hardcodes 10. */
export const BAR_CELLS = 10;

/** Percentages are shown as integers — the script rounds before printing. */
const pctText = (pct: number): string => `${Math.round(pct)}%`;

/**
 * Every value on the line changes while a loop plays, so each variable-width
 * field is padded to the widest string it can ever hold. Without this the cell
 * grid re-flows the moment `9%` becomes `100%` and the whole line shuffles
 * sideways mid-animation — the padding is what keeps segment x-positions
 * identical from frame to frame.
 */
const PCT_CELLS = 4; // '100%'
const RESET_CELLS = 7; // '↻6d23h' — the widest a 7-day countdown gets

/** Right-aligned, so the digits grow leftward into the gap and the `%` never moves. */
const pctField = (pct: number): string => pctText(pct).padStart(PCT_CELLS);

/** Left-aligned: the `↻` is the anchor, so it stays put as the duration shortens. */
const resetField = (seconds: number): string =>
  `↻${fmtReset(seconds)}`.padEnd(RESET_CELLS);

const limitSegment = (
  id: 'five' | 'week' | 'fable',
  label: string,
  window: LimitWindow
): Segment => {
  const pct = Math.round(window.pct);
  const color = pctColor(pct);
  const parts: Part[] = [
    {kind: 'text', text: `${label} `, color: colors.dim},
    window.elapsed === undefined
      ? {kind: 'bar', pct, width: BAR_CELLS, color}
      : {
          kind: 'stacked',
          usage: pct,
          elapsed: window.elapsed,
          width: BAR_CELLS,
          color,
        },
    {kind: 'text', text: ` ${pctField(pct)}`, color},
  ];
  if (window.resetsIn !== undefined) {
    parts.push({
      kind: 'text',
      text: ` ${resetField(window.resetsIn)}`,
      color: colors.dim,
    });
  }
  return segment(id, parts);
};

/**
 * Build the segment list in the same order, colours and thresholds as
 * statusline.sh. Callers animate by passing a different state per frame.
 * Omitting a field drops its segment (separators included) — the script's own
 * conditionals, except that it always prints a model, defaulting to `?`.
 */
export const buildSegments = (state: StatuslineState): Segment[] => {
  const segments: Segment[] = [];

  if (state.dir) {
    const parts: Part[] = [{kind: 'text', text: state.dir, color: colors.dir}];
    if (state.branch) {
      parts.push({kind: 'text', text: ` ⎇ ${state.branch}`, color: colors.dim});
    }
    segments.push(segment('dir', parts));
  }

  if (state.model) {
    segments.push(
      segment('model', [
        {kind: 'text', text: `★ ${state.model}`, color: colors.green},
      ])
    );
  }

  if (state.ctx !== undefined) {
    const pct = Math.round(state.ctx);
    const color = ctxColor(pct);
    segments.push(
      segment('ctx', [
        {kind: 'text', text: 'Ctx ', color: colors.dim},
        {kind: 'bar', pct, width: BAR_CELLS, color},
        {kind: 'text', text: ` ${pctField(pct)}`, color},
      ])
    );
  }

  if (state.five) segments.push(limitSegment('five', '5h', state.five));
  if (state.week) segments.push(limitSegment('week', '7d', state.week));
  if (state.fable)
    segments.push(limitSegment('fable', 'Fable', state.fable));

  return segments;
};

/** ` │ ` — the separator the script puts between segments. */
export const SEPARATOR_CELLS = 3;

export type SegmentBox = {id: Segment['id']; start: number; cells: number};

/**
 * Column offset of every segment, separators included. Frame-exact and DOM-free,
 * so the camera can target a segment by id at any zoom.
 */
export const layout = (
  segments: Segment[]
): {boxes: SegmentBox[]; cells: number} => {
  const boxes: SegmentBox[] = [];
  let column = 0;
  segments.forEach((seg, index) => {
    if (index > 0) column += SEPARATOR_CELLS;
    boxes.push({id: seg.id, start: column, cells: seg.cells});
    column += seg.cells;
  });
  return {boxes, cells: column};
};
