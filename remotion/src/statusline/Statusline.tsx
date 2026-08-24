import React from 'react';
import {cellWidth as cellWidthFor, colors, fontFamily, lineHeight, metrics} from '../theme';
import {Bar, StackedBar} from './Bar';
import {buildSegments, layout, partCells, SEPARATOR_CELLS} from './segments';
import type {Part, SegmentId, StatuslineState} from './types';

/** One glyph per cell, absolutely placed — the grid never drifts with the font. */
export const TextRun: React.FC<{
  text: string;
  color: string;
  cellWidth: number;
  cellHeight: number;
  bold?: boolean;
}> = ({text, color, cellWidth, cellHeight, bold}) => (
  <>
    {[...text].map((ch, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: i * cellWidth,
          top: 0,
          width: cellWidth,
          height: cellHeight,
          color,
          fontWeight: bold ? 700 : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {ch === ' ' ? '' : ch}
      </div>
    ))}
  </>
);

const PartView: React.FC<{
  part: Part;
  cellWidth: number;
  cellHeight: number;
  glow: boolean;
}> = ({part, cellWidth, cellHeight, glow}) => {
  if (part.kind === 'text') {
    return (
      <TextRun
        text={part.text}
        color={part.color}
        cellWidth={cellWidth}
        cellHeight={cellHeight}
        bold={part.bold}
      />
    );
  }
  if (part.kind === 'bar') {
    return (
      <Bar
        pct={part.pct}
        width={part.width}
        color={part.color}
        cellWidth={cellWidth}
        cellHeight={cellHeight}
      />
    );
  }
  return (
    <StackedBar
      usage={part.usage}
      elapsed={part.elapsed}
      width={part.width}
      color={part.color}
      cellWidth={cellWidth}
      cellHeight={cellHeight}
      glow={glow}
    />
  );
};

/** Only a numeric style opacity composes; anything else (`'50%'`) is ignored. */
const numericOpacity = (opacity: React.CSSProperties['opacity']): number =>
  typeof opacity === 'number' ? opacity : 1;

export type StatuslineProps = {
  state: StatuslineState;
  fontSize?: number;
  /** Explicit opacity per segment. Wins over `spotlight`. */
  segmentOpacity?: Partial<Record<SegmentId, number>>;
  /** Brighten one segment and dim its siblings to `dimLevel`. */
  spotlight?: SegmentId | null;
  dimLevel?: number;
  /** Extra per-segment styling — used for the hero's segment-by-segment reveal. */
  segmentStyle?: (id: SegmentId, index: number) => React.CSSProperties;
  /** Stacked bars that should glow where usage overshoots elapsed time. */
  glow?: SegmentId[];
  /**
   * Lay the row out space-between over this many cells, as the script lays out
   * its first row. Omit to pack left.
   */
  spreadTo?: number;
};

/**
 * The statusline itself: same segments, order, colours and conditionals as
 * statusline.sh, laid out on a terminal cell grid so anything on it can be
 * animated, dimmed, or zoomed into by id.
 */
export const Statusline: React.FC<StatuslineProps> = ({
  state,
  fontSize = metrics.fontSize,
  segmentOpacity,
  spotlight = null,
  dimLevel = 0.25,
  segmentStyle,
  glow = [],
  spreadTo,
}) => {
  const cw = cellWidthFor(fontSize);
  const ch = lineHeight(fontSize);
  const segments = buildSegments(state);
  const {boxes, cells} = layout(segments, spreadTo);

  const opacityFor = (id: SegmentId): number => {
    const explicit = segmentOpacity?.[id];
    if (explicit !== undefined) return explicit;
    if (spotlight === null) return 1;
    return id === spotlight ? 1 : dimLevel;
  };

  /**
   * What a segment is actually worth on screen: the dim level and any
   * style-supplied opacity composed, so a segment can be mid-reveal *and*
   * dimmed. Separators read the same number, which is why they can never
   * outshine the segments they divide.
   */
  const effectiveOpacity = (index: number): number => {
    const seg = segments[index];
    return (
      opacityFor(seg.id) *
      numericOpacity(segmentStyle?.(seg.id, index)?.opacity)
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        width: cells * cw,
        height: ch,
        fontFamily,
        fontSize,
        lineHeight: `${ch}px`,
        whiteSpace: 'pre',
      }}
    >
      {segments.map((seg, index) => {
        const box = boxes[index];
        let column = box.start;
        // Opacity is applied via effectiveOpacity(); the rest of the style rides along.
        const {opacity: _styleOpacity, ...extraStyle} =
          segmentStyle?.(seg.id, index) ?? {};
        return (
          <React.Fragment key={seg.id}>
            {box.separator ? (
              <div
                style={{
                  position: 'absolute',
                  left: (box.start - SEPARATOR_CELLS) * cw,
                  top: 0,
                  height: ch,
                  // A separator is only as bright as the dimmer of the two
                  // segments it divides — otherwise a dimmed or half-revealed
                  // line reads as bright pipes floating over ghosted text.
                  opacity: Math.min(
                    effectiveOpacity(index - 1),
                    effectiveOpacity(index)
                  ),
                }}
              >
                <TextRun
                  text=" │ "
                  color={colors.sep}
                  cellWidth={cw}
                  cellHeight={ch}
                />
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: box.start * cw,
                top: 0,
                width: box.cells * cw,
                height: ch,
                opacity: effectiveOpacity(index),
                ...extraStyle,
              }}
            >
              {seg.parts.map((part, partIndex) => {
                const partLeft = column - box.start;
                column += partCells(part);
                return (
                  <div
                    key={partIndex}
                    style={{
                      position: 'absolute',
                      left: partLeft * cw,
                      top: 0,
                      height: ch,
                    }}
                  >
                    <PartView
                      part={part}
                      cellWidth={cw}
                      cellHeight={ch}
                      glow={glow.includes(seg.id)}
                    />
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
