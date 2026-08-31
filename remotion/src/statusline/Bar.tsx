import React from 'react';
import {colors} from '../theme';

type BarProps = {
  pct: number;
  /** Width in cells. */
  width: number;
  color: string;
  cellWidth: number;
  cellHeight: number;
};

/**
 * The plain bar: a solid fill on a dark track, quantised to 1/8 of a cell —
 * the ▏▎▍▌▋▊▉ partial blocks the script prints. The quantisation is the point;
 * a smooth fill would hide the stepping the Context animation is built around.
 */
export const Bar: React.FC<BarProps> = ({
  pct,
  width,
  color,
  cellWidth,
  cellHeight,
}) => {
  const clamped = Math.min(100, Math.max(0, pct));
  const eighths = Math.floor((clamped * width * 8) / 100);
  return (
    <div
      style={{
        position: 'relative',
        width: width * cellWidth,
        height: cellHeight,
        backgroundColor: colors.track,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: (eighths / 8) * cellWidth,
          backgroundColor: color,
        }}
      />
    </div>
  );
};

type StackedBarProps = {
  usage: number;
  elapsed: number;
  width: number;
  color: string;
  cellWidth: number;
  cellHeight: number;
  /** Soft glow on usage cells that stick out past the elapsed-time fill. */
  glow?: boolean;
};

/**
 * The stacked bar: usage on the top half, window-time-elapsed (blue) on the
 * bottom half of the same cells — the ▀ half-block trick from the script.
 * Both halves snap to whole cells, so they read as discrete ticks.
 */
export const StackedBar: React.FC<StackedBarProps> = ({
  usage,
  elapsed,
  width,
  color,
  cellWidth,
  cellHeight,
  glow = false,
}) => {
  const u = Math.min(100, Math.max(0, usage));
  const t = Math.min(100, Math.max(0, elapsed));
  let usedCells = Math.round((u * width) / 100);
  let timeCells = Math.round((t * width) / 100);
  if (u > 0 && usedCells === 0) usedCells = 1;
  if (t > 0 && timeCells === 0) timeCells = 1;

  return (
    <div
      style={{
        position: 'relative',
        width: width * cellWidth,
        height: cellHeight,
        backgroundColor: colors.track,
      }}
    >
      {Array.from({length: width}, (_, i) => {
        const filled = i < usedCells;
        const overshooting = filled && i >= timeCells;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i * cellWidth,
              top: 0,
              width: cellWidth,
              height: cellHeight,
            }}
          >
            <div
              style={{
                height: '50%',
                backgroundColor: filled ? color : colors.track,
                // 0.16em, matching the glow signed off in the prototype — a
                // cell-wide bloom washed the bar's geometry out entirely.
                boxShadow:
                  glow && overshooting
                    ? `0 0 ${cellHeight * 0.16}px ${color}`
                    : undefined,
              }}
            />
            <div
              style={{
                height: '50%',
                backgroundColor: i < timeCells ? colors.blue : colors.track,
                // Above the glow, so the bloom spills upward into the body
                // instead of tinting the blue clock underneath it.
                position: 'relative',
                zIndex: 1,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

type VertMeterProps = {
  usage: number;
  elapsed: number;
  color: string;
  cellWidth: number;
  cellHeight: number;
};

/** 1–8, the ▁▂▃▄▅▆▇█ ladder — vglyph() in statusline.sh, ▁ as the floor. */
const vLevel = (pct: number): number =>
  Math.max(1, Math.floor((Math.min(100, Math.max(0, pct)) * 8 + 50) / 100));

/**
 * The vertical meter: the stacked bar folded into two columns — usage height
 * (pace-coloured) beside window-time height (blue), both on the dark track,
 * quantised to eighths of a cell the way the block glyphs force.
 */
export const VertMeter: React.FC<VertMeterProps> = ({
  usage,
  elapsed,
  color,
  cellWidth,
  cellHeight,
}) => {
  const column = (level: number, background: string, left: number) => (
    <div
      style={{
        position: 'absolute',
        left,
        bottom: 0,
        width: cellWidth,
        height: (level / 8) * cellHeight,
        backgroundColor: background,
      }}
    />
  );
  return (
    <div
      style={{
        position: 'relative',
        width: 2 * cellWidth,
        height: cellHeight,
        backgroundColor: colors.track,
      }}
    >
      {column(vLevel(usage), color, 0)}
      {column(vLevel(elapsed), colors.blue, cellWidth)}
    </div>
  );
};
