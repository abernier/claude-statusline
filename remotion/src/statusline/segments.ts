import {colors, ctxColor, paceColor, pctColor} from '../theme';
import type {
  AgentRow,
  LimitWindow,
  Part,
  Segment,
  SegmentId,
  StatuslineState,
} from './types';

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

/** fmt_tokens in statusline.sh — context tokens in thousands, 1k … 999k. */
export const fmtTokens = (tokens: number): string =>
  `${Math.min(999, Math.max(1, Math.round(tokens / 1000)))}k`;

/**
 * Every value on the line changes while a loop plays, so each variable-width
 * field is padded to the widest string it can ever hold. Without this the cell
 * grid re-flows the moment `9%` becomes `100%` and the whole line shuffles
 * sideways mid-animation — the padding is what keeps segment x-positions
 * identical from frame to frame.
 */
const PCT_CELLS = 4; // '100%'
const RESET_CELLS = 7; // '↻6d23h' — the widest a 7-day countdown gets
const TOKENS_CELLS = 4; // '999k'

/** Right-aligned, so the digits grow leftward into the gap and the `%` never moves. */
const pctField = (pct: number): string => pctText(pct).padStart(PCT_CELLS);

/** Right-aligned too, which keeps the `k` in one column as the count grows. */
const tokensField = (tokens: number): string =>
  fmtTokens(tokens).padStart(TOKENS_CELLS);

/** Left-aligned: the `↻` is the anchor, so it stays put as the duration shortens. */
const resetField = (seconds: number): string =>
  `↻${fmtReset(seconds)}`.padEnd(RESET_CELLS);

const limitSegment = (
  id: 'five' | 'week' | 'fable',
  label: string,
  window: LimitWindow,
  showReset = true
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
          // The bar's top row reads pace against the blue row; the % text
          // keeps the absolute thresholds.
          color: paceColor(pct, window.elapsed),
        },
    {kind: 'text', text: ` ${pctField(pct)}`, color},
  ];
  if (showReset && window.resetsIn !== undefined) {
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
      if (state.worktree) {
        parts.push({kind: 'text', text: ' ⎇+', color: colors.amber});
        parts.push({kind: 'text', text: ` ${state.branch}`, color: colors.dim});
      } else {
        parts.push({kind: 'text', text: ` ⎇ ${state.branch}`, color: colors.dim});
      }
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
    const parts: Part[] = [
      {kind: 'text', text: 'Ctx ', color: colors.dim},
      {kind: 'bar', pct, width: BAR_CELLS, color},
      {kind: 'text', text: ` ${pctField(pct)}`, color},
    ];
    if (state.ctxTokens !== undefined && state.ctxTokens > 0) {
      parts.push({
        kind: 'text',
        text: ` ${tokensField(state.ctxTokens)}`,
        color: colors.dim,
      });
    }
    segments.push(segment('ctx', parts));
  }

  if (state.five) segments.push(limitSegment('five', '5h', state.five));
  if (state.week) segments.push(limitSegment('week', '7d', state.week));
  // Fable drops the ↻ countdown: its window resets with the 7-day one, so the
  // segment before it already shows that time.
  if (state.fable)
    segments.push(limitSegment('fable', 'Fable', state.fable, false));

  return segments;
};

/**
 * One agent-panel row, as subagent-statusline.sh draws it: name in the
 * directory blue, the agent's own context bar and percentage on ctx
 * thresholds, the token count, then ` · ` and the description in dim. The
 * name is padded to a fixed column so the rows' bars align, and the tokens
 * are the same reading as the percentage, derived against a 1M window.
 */
export const buildAgentRow = (row: AgentRow, nameCells: number): Part[] => {
  const pct = Math.round(row.ctx);
  const color = ctxColor(pct);
  return [
    {kind: 'text', text: row.name.padEnd(nameCells), color: colors.dir},
    {kind: 'text', text: ' ', color: colors.dim},
    {kind: 'bar', pct, width: BAR_CELLS, color},
    {kind: 'text', text: ` ${pctField(pct)}`, color},
    {kind: 'text', text: ` ${tokensField((pct / 100) * 1000000)}`, color: colors.dim},
    {kind: 'text', text: ' · ', color: colors.sep},
    {kind: 'text', text: row.desc, color: colors.dim},
  ];
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

/**
 * Column offset and width of one segment's bar. The landing page measures the
 * painted `.bar` with `getBoundingClientRect`; here the geometry is already
 * known, so the annotation is placed against this instead of against the DOM.
 *
 * Every variable-width field is padded (see `pctField` and friends), so this
 * answer is the same on every frame of a loop — the marks cannot slide while
 * `9%` grows into `100%`.
 */
export const barColumns = (
  segments: Segment[],
  id: SegmentId
): {start: number; cells: number} | null => {
  const index = segments.findIndex((seg) => seg.id === id);
  if (index < 0) return null;
  const {boxes} = layout(segments);
  let column = boxes[index].start;
  for (const part of segments[index].parts) {
    if (part.kind === 'bar' || part.kind === 'stacked')
      return {start: column, cells: part.width};
    column += partCells(part);
  }
  return null;
};
