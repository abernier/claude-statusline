import React from 'react';
import {Camera, segmentCenterX, statuslineWidth} from './terminal/Camera';
import {Statusline, type StatuslineProps} from './statusline/Statusline';
import {Terminal, TerminalBody} from './terminal/Terminal';
import {buildSegments, layout} from './statusline/segments';
import {metrics} from './theme';
import type {SegmentId, StatuslineState} from './statusline/types';

/** Largest font size at which the whole line still fits the given width. */
export const fitFontSize = (
  state: StatuslineState,
  availableWidth: number
): number => {
  const cells = layout(buildSegments(state)).cells;
  return Math.floor(availableWidth / (cells * metrics.cellWidthRatio));
};

export type SceneProps = Omit<StatuslineProps, 'fontSize'> & {
  fontSize?: number;
  caption?: React.ReactNode;
  /** Camera zoom. 1 = true scale; ~2 = the push-in / isolated crop. */
  scale?: number;
  /**
   * Segment the camera holds at frame centre. Snaps — use it for a shot that
   * starts already framed on a segment.
   */
  focus?: SegmentId | null;
  /**
   * Continuous camera centre, in pixels from the start of the line. Wins over
   * `focus`, and is what a *moving* camera animates: interpolate from
   * `statuslineWidth(state, fontSize) / 2` to `segmentCenterX(state, id, fontSize)`
   * to pan onto a segment while `scale` eases in.
   */
  focusX?: number;
};

/**
 * One shot: terminal chrome, caption line, statusline, camera. The five loops
 * are all this component with different values animated into it.
 */
export const Scene: React.FC<SceneProps> = ({
  state,
  fontSize = metrics.fontSize,
  caption,
  scale = 1,
  focus = null,
  focusX,
  ...statuslineProps
}) => {
  const contentWidth = statuslineWidth(state, fontSize);
  const center =
    focusX ?? (focus ? segmentCenterX(state, focus, fontSize) : undefined);
  return (
    <Terminal fontSize={fontSize}>
      <TerminalBody fontSize={fontSize} caption={caption}>
        <Camera scale={scale} focusX={center} contentWidth={contentWidth}>
          <Statusline state={state} fontSize={fontSize} {...statuslineProps} />
        </Camera>
      </TerminalBody>
    </Terminal>
  );
};
