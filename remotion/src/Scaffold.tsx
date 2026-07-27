import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Scene, fitFontSize} from './Scene';
import {segmentCenterX, statuslineWidth} from './terminal/Camera';
import {TypedComment} from './terminal/TypedComment';
import {SAMPLE_FIVE_ELAPSED, SAMPLE_STATE} from './sample';
import {FIVE_WINDOW, remaining} from './stories';
import type {SegmentId} from './statusline/types';

const REVEAL_ORDER: SegmentId[] = ['dir', 'model', 'ctx', 'five', 'week', 'fable'];

/**
 * Not one of the five loops — a smoke test for the scaffold that exercises every
 * capability the storyboards need: segment-by-segment reveal, live values,
 * spotlight dimming, a camera push-in, the overshoot glow, and a typed caption.
 */
export const Scaffold: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const s = (seconds: number) => seconds * fps;

  const fontSize = fitFontSize(SAMPLE_STATE, width - 120);

  const ctx = interpolate(frame, [s(2), s(4)], [19, 34], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fiveUsage = interpolate(frame, [s(5), s(8)], [12, 88], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fiveElapsed = interpolate(frame, [s(5), s(8)], [SAMPLE_FIVE_ELAPSED, 46], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // The push-in: scale and camera centre ease together, so the camera travels
  // onto the 5h segment instead of cutting to it.
  const push = interpolate(frame, [s(4.5), s(5.2)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = interpolate(push, [0, 1], [1, 2]);
  const focusX = interpolate(push, [0, 1], [
    statuslineWidth(SAMPLE_STATE, fontSize) / 2,
    segmentCenterX(SAMPLE_STATE, 'five', fontSize),
  ]);

  const spotlight: SegmentId | null =
    frame >= s(2) && frame < s(4.5) ? 'ctx' : null;

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Scene
        state={{
          ...SAMPLE_STATE,
          ctx,
          five: {
            pct: fiveUsage,
            elapsed: fiveElapsed,
            // Derived, so the countdown and the blue half never drift apart.
            resetsIn: remaining(fiveElapsed, FIVE_WINDOW),
          },
        }}
        fontSize={fontSize}
        spotlight={spotlight}
        scale={scale}
        focusX={focusX}
        glow={['five']}
        segmentStyle={(id) => {
          // Reveal left→right, ~200ms apart, each landing with a small fade-up.
          const start = s(0.2 * REVEAL_ORDER.indexOf(id));
          const progress = interpolate(frame, [start, start + s(0.35)], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return {
            opacity: progress,
            transform: `translateY(${(1 - progress) * fontSize * 0.35}px)`,
          };
        }}
        caption={
          <>
            <Sequence from={s(2)} durationInFrames={s(2.4)}>
              <TypedComment text="context window used" fontSize={fontSize} />
            </Sequence>
            <Sequence from={s(5)} durationInFrames={s(4)}>
              <TypedComment
                text="usage past the clock = burning too fast"
                fontSize={fontSize}
              />
            </Sequence>
          </>
        }
      />
    </AbsoluteFill>
  );
};
