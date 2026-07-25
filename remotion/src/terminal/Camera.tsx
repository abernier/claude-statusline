import React from 'react';
import {cellWidth as cellWidthFor, metrics} from '../theme';
import {buildSegments, layout} from '../statusline/segments';
import type {SegmentId, StatuslineState} from '../statusline/types';

/**
 * Horizontal centre of a segment, in pixels from the start of the statusline.
 * Pure layout maths — no DOM measurement — so it is stable across renders and
 * can be fed straight into `interpolate` for a push-in.
 */
export const segmentCenterX = (
  state: StatuslineState,
  id: SegmentId,
  fontSize: number = metrics.fontSize
): number => {
  const {boxes} = layout(buildSegments(state));
  const box = boxes.find((b) => b.id === id);
  if (!box) return 0;
  return (box.start + box.cells / 2) * cellWidthFor(fontSize);
};

/** Full width of the statusline in pixels. */
export const statuslineWidth = (
  state: StatuslineState,
  fontSize: number = metrics.fontSize
): number => layout(buildSegments(state)).cells * cellWidthFor(fontSize);

export type CameraProps = {
  /** 1 = full line at true scale; 2 = the push-in. */
  scale?: number;
  /**
   * Point in content space to hold at the centre of the frame. Omit to keep the
   * content centred (scale about its own middle).
   */
  focusX?: number;
  /** Width of the content being framed, used when `focusX` is omitted. */
  contentWidth?: number;
  children: React.ReactNode;
};

/**
 * Camera transform layer. Wrap the terminal's content in it and animate `scale`
 * and `focusX` — cropping to a single segment is just a hard push-in onto that
 * segment's centre, with the frame clipping the rest.
 */
export const Camera: React.FC<CameraProps> = ({
  scale = 1,
  focusX,
  contentWidth,
  children,
}) => {
  const center = focusX ?? (contentWidth ?? 0) / 2;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          transform: `scale(${scale}) translateX(${
            (contentWidth ?? 0) / 2 - center
          }px)`,
          // Anchored to the bottom line: a push-in grows the statusline upward
          // into empty body rather than off the bottom of the frame.
          transformOrigin: 'center bottom',
        }}
      >
        {children}
      </div>
    </div>
  );
};
