import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {AgentPanel} from './statusline/AgentPanel';
import {Annotation, annotationFontSize, headroom} from './statusline/Annotation';
import {Statusline} from './statusline/Statusline';
import {STILL_PROGRESS, storyById} from './stories';
import {colors, page} from './theme';

export type LoopProps = {
  storyId: string;
  fontSize: number;
  /** Freeze on the representative frame — used for stills, not the loops. */
  frozen?: boolean;
  /** Name the race the bar draws: lane names, edge marks, the gap reading. */
  annotate?: boolean;
  /** Override the annotation text size. Defaults to the landing page's ratio. */
  annFontSize?: number;
};

/**
 * The frame around the panel. Exported because the canvas of an annotated loop
 * is sized from the annotation outward, and has to add this back on.
 */
export const LOOP_PADDING = 28;

/**
 * One loop, framed the way the landing page frames it: a sunken rounded panel on
 * the page background, the line centred inside it, nothing else. No terminal
 * chrome — the page *is* the terminal (#4), so a second window border around the
 * crop would read as a window inside a window.
 *
 * The canvas is deliberately larger than the line: these render to GIF for the
 * README, and a GIF cropped tight to the glyphs has nowhere to breathe.
 */
export const Loop: React.FC<LoopProps> = ({
  storyId,
  fontSize,
  frozen = false,
  annotate = false,
  annFontSize,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const story = storyById(storyId);

  // p wraps at the composition's own length, so the loop is seamless by
  // construction rather than by picking the right duration.
  const p = frozen ? STILL_PROGRESS : (frame % durationInFrames) / durationInFrames;
  const state = story.at(p);

  const race = annotate ? story.race : undefined;
  // The room is reserved from the story's *static* race, not from this frame's:
  // the effort row comes and goes across a loop, and a canvas that resized with
  // it would make the line jump.
  const room = race
    ? headroom(annFontSize ?? annotationFontSize(fontSize), Boolean(race.effort))
    : {above: 0, below: 0};
  const level = race?.effort?.at(p) ?? null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: LOOP_PADDING,
      }}
    >
      <div
        style={{
          flex: 1,
          alignSelf: 'stretch',
          backgroundColor: page.sunk,
          border: `1px solid ${page.line}`,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* the marks hang off the line, so the wrapper carries their room as
            margins — the flex centring then centres line *and* annotation */}
        <div
          style={{
            position: 'relative',
            marginTop: room.above,
            marginBottom: room.below,
          }}
        >
          {state.agents ? (
            <AgentPanel rows={state.agents} fontSize={fontSize} />
          ) : (
            <Statusline state={state} fontSize={fontSize} glow={story.glow ?? []} />
          )}
          {race ? (
            <Annotation
              state={state}
              segment={race.segment}
              effort={
                race.effort && level
                  ? {switchAt: race.effort.switchAt, level}
                  : undefined
              }
              fontSize={fontSize}
              annFontSize={annFontSize}
            />
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
