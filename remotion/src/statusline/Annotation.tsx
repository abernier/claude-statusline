import React from 'react';
import {cellWidth as cellWidthFor, colors, fontFamily, lineHeight, page} from '../theme';
import {barColumns, buildSegments} from './segments';
import type {StatuslineState} from './types';

/**
 * The annotation, ported from `annotate()` in `docs/index.html`.
 *
 * A bar that holds a race gets its two racers named, each one marked where it
 * actually is, and the distance between them read out. That distance is the
 * number the bar draws and never says. `loop-burn` also carries the effort row:
 * one cell per tenth of the window, coloured by the effort level in force while
 * the clock crossed it.
 *
 * The page measures the painted `.bar`. This computes the same rectangle from
 * `theme.ts` and the cell grid, so nothing here depends on the DOM.
 */

/** Both files decide the same way. Change one, change the other. */
const GAP_HOT = 12;
const GAP_COOL = -12;

const verdict = (gap: number): {color: string; word: string} =>
  gap >= GAP_HOT
    ? {color: colors.red, word: 'ahead of the clock'}
    : gap <= GAP_COOL
      ? {color: colors.green, word: 'behind the clock'}
      : {color: colors.yellow, word: 'level with the clock'};

const signed = (n: number): string => (n > 0 ? '+' : '') + n;

/**
 * The page sets the annotation at 11.5px against a statusline that caps at 44px
 * and settles near 39px. Holding that ratio is what keeps a rendered crop and
 * the live crop beside it the same drawing at two sizes.
 */
export const ANNOTATION_RATIO = 11.5 / 39;

export const annotationFontSize = (statuslineFontSize: number): number =>
  statuslineFontSize * ANNOTATION_RATIO;

/**
 * Room the marks need above and below the line, from the page's own
 * `.crop.annotated` padding: 66px above, 80px below, 124px below with the
 * effort row. Expressed against the annotation text, so they scale with it.
 */
const ABOVE_EM = 66 / 11.5;
const BELOW_EM = 80 / 11.5;
const BELOW_EFFORT_EM = 124 / 11.5;

export type Headroom = {above: number; below: number};

export const headroom = (annFontSize: number, withEffort: boolean): Headroom => ({
  above: annFontSize * ABOVE_EM,
  below: annFontSize * (withEffort ? BELOW_EFFORT_EM : BELOW_EM),
});

/** Height of the line plus its annotation — what an annotated canvas must hold. */
export const annotatedHeight = (
  statuslineFontSize: number,
  withEffort: boolean,
  annFontSize = annotationFontSize(statuslineFontSize)
): number => {
  const room = headroom(annFontSize, withEffort);
  return room.above + lineHeight(statuslineFontSize) + room.below;
};

export type EffortRecord = {
  /** The clock reading at the moment the effort dropped. */
  switchAt: number;
  /** The level in force right now. `low` is what puts the second run label out. */
  level: 'high' | 'low';
};

export type AnnotationProps = {
  state: StatuslineState;
  /** Which bar carries the race. A plain bar has no clock, so it has no race. */
  segment: 'five' | 'week' | 'fable';
  effort?: EffortRecord;
  /** The statusline's own font size — the annotation is placed against its grid. */
  fontSize: number;
  /** Override the annotation text size. GIF may not tolerate the page's ratio. */
  annFontSize?: number;
};

export const Annotation: React.FC<AnnotationProps> = ({
  state,
  segment,
  effort,
  fontSize,
  annFontSize = annotationFontSize(fontSize),
}) => {
  const limit = state[segment];
  const columns = barColumns(buildSegments(state), segment);
  if (!limit || limit.elapsed === undefined || !columns) return null;

  const cw = cellWidthFor(fontSize);
  const box = {
    x: columns.start * cw,
    y: 0,
    w: columns.cells * cw,
    h: lineHeight(fontSize),
  };

  // Everything below is the page's pixel constants at the page's text size.
  // `k` carries them to this one, so the two drawings stay the same drawing.
  const k = annFontSize / 11.5;

  const u = limit.pct;
  const t = limit.elapsed;
  const gap = Math.round(u) - Math.round(t);
  const v = verdict(gap);

  // The edge marks sit where the racers actually are, not where the cells round
  // to. Two racers five points apart light the same cell — the bar cannot show
  // that and the span can.
  const x = (pct: number): number =>
    box.x + (box.w * Math.max(0, Math.min(100, pct))) / 100;
  const xu = x(u);
  const xt = x(t);
  const lo = Math.min(xu, xt);
  const hi = Math.max(xu, xt);
  const readY = box.y + box.h + 44 * k;

  const mark: React.CSSProperties = {position: 'absolute'};
  const label: React.CSSProperties = {
    ...mark,
    whiteSpace: 'nowrap',
    transform: 'translateY(-50%)',
  };
  const caps: React.CSSProperties = {
    ...label,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
  };

  const cells = columns.cells;
  // rowY = readY + 26, the row is 11 tall, and the run labels drop 25 below it
  const rowY = readY + 26 * k;
  const runY = rowY + 25 * k;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: box.x + box.w,
        height: box.h,
        fontFamily,
        fontSize: annFontSize,
        lineHeight: 1.2,
      }}
    >
      <span style={{...caps, left: box.x, top: box.y - 13 * k, color: colors.dim}}>
        you
      </span>
      <span
        style={{...caps, left: box.x, top: box.y + box.h + 13 * k, color: '#5f86ad'}}
      >
        the clock
      </span>

      <span
        style={{
          ...mark,
          left: xu,
          top: box.y,
          height: readY - box.y,
          borderLeft: `${k}px dashed #555`,
        }}
      />
      <span
        style={{
          ...mark,
          left: xt,
          top: box.y + box.h / 2,
          height: readY - box.y - box.h / 2,
          borderLeft: `${k}px dashed #555`,
        }}
      />
      <span
        style={{
          ...mark,
          left: lo,
          width: hi - lo,
          top: readY,
          borderTop: `${k}px dashed ${v.color}`,
        }}
      />
      {/* the reading sits past the right-hand mark, so it never runs off the
          left while both racers are still near zero */}
      <span
        style={{
          ...label,
          left: hi,
          top: readY,
          paddingLeft: 9 * k,
          color: v.color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {signed(gap)} · {v.word}
      </span>

      {effort ? (
        <>
          {/* one cell per tenth of the window, exactly as wide as the bar and
              landing on the bar's ten cells — or the record does not line up
              with the thing it is a record of */}
          <span
            style={{
              ...mark,
              left: box.x,
              top: rowY,
              height: 11 * k,
              display: 'flex',
            }}
          >
            {Array.from({length: cells}, (_, i) => {
              const mid = i * (100 / cells) + 100 / cells / 2;
              return (
                <i
                  key={i}
                  style={{
                    display: 'block',
                    width: box.w / cells,
                    height: '100%',
                    boxSizing: 'border-box',
                    borderRight:
                      i === cells - 1 ? undefined : `${2 * k}px solid ${page.sunk}`,
                    background:
                      mid > t
                        ? // the clock has not crossed this tenth yet, so there
                          // is no effort to record
                          'rgba(255,255,255,.055)'
                        : mid < effort.switchAt
                          ? page.brand
                          : '#6f6f6f',
                  }}
                />
              );
            })}
          </span>
          {/* the row's own name goes at its right-hand end: on the left it sits
              on top of the reading for half of every loop */}
          <span
            style={{
              ...caps,
              left: box.x + box.w,
              top: rowY + (11 * k) / 2,
              paddingLeft: 11 * k,
              color: page.brand,
            }}
          >
            effort
          </span>
          {/* each run names itself under its own cells, so the switch is where
              one label stops and the other starts */}
          <span style={{...caps, left: box.x, top: runY, color: page.brand}}>high</span>
          {effort.level === 'low' ? (
            <span style={{...caps, left: x(effort.switchAt), top: runY, color: '#8a8a8a'}}>
              low
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
