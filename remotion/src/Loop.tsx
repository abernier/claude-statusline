import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Statusline} from './statusline/Statusline';
import {STILL_PROGRESS, storyById} from './stories';
import {colors, page} from './theme';

export type LoopProps = {
  storyId: string;
  fontSize: number;
  /** Freeze on the representative frame — used for stills, not the loops. */
  frozen?: boolean;
};

/**
 * One loop, framed the way the landing page frames it: a sunken rounded panel on
 * the page background, the line centred inside it, nothing else. No terminal
 * chrome — the page *is* the terminal (#4), so a second window border around the
 * crop would read as a window inside a window.
 *
 * The canvas is deliberately larger than the line: these render to GIF for the
 * README, and a GIF cropped tight to the glyphs has nowhere to breathe.
 */
export const Loop: React.FC<LoopProps> = ({storyId, fontSize, frozen = false}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const story = storyById(storyId);

  // p wraps at the composition's own length, so the loop is seamless by
  // construction rather than by picking the right duration.
  const p = frozen ? STILL_PROGRESS : (frame % durationInFrames) / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
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
        <Statusline
          state={story.at(p)}
          fontSize={fontSize}
          glow={story.glow ?? []}
        />
      </div>
    </AbsoluteFill>
  );
};
