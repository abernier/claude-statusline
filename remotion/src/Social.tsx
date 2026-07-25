import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Statusline} from './statusline/Statusline';
import {STILL_PROGRESS, storyById} from './stories';
import {colors, fontFamily, page} from './theme';

/**
 * One inline rhythm for every region in the frame — the craft rule carried over
 * from #4, where two competing padding systems was the worst visual bug in the
 * prototype. Everything below aligns to this single left edge.
 */
const PAD = 46;

const Head: React.FC = () => (
  <div style={{display: 'flex', gap: 18, padding: `30px ${PAD}px 16px`}}>
    <Img
      src={staticFile('claude-logo.svg')}
      style={{width: 38, height: 38, flex: 'none'}}
    />
    <div>
      <div>
        <span style={{color: '#f2f2f2', fontWeight: 700}}>Claude Code</span>
        <span style={{color: '#5f5f5f', marginLeft: 10}}>v2.1.294</span>
      </div>
      <div style={{color: '#a9a9a9', lineHeight: 1.7}}>
        Opus 5 with high effort · Claude Max
      </div>
      <div style={{color: '#a9a9a9', lineHeight: 1.7}}>
        ~/dev/projects/claude-statusline
      </div>
    </div>
  </div>
);

const Hint: React.FC = () => (
  <div
    style={{
      display: 'flex',
      gap: 13,
      color: page.muted,
      padding: `0 ${PAD}px`,
      lineHeight: 1.6,
    }}
  >
    <span
      style={{width: 2, flex: '0 0 2px', background: '#3a3a3a', borderRadius: 2}}
    />
    <span>Using Opus 5 (from .claude/settings.json) · /model</span>
  </div>
);

/**
 * The docked line, exactly where the real statusline renders: under the `⟩`
 * prompt, above the mode line.
 */
const Dock: React.FC<{fontSize: number}> = ({fontSize}) => (
  <>
    <div
      style={{
        borderTop: `1px solid #2b2b2b`,
        padding: `20px ${PAD}px`,
        display: 'flex',
        gap: 13,
        color: '#6a6a6a',
      }}
    >
      <span style={{color: page.muted}}>⟩</span>
      <span style={{color: page.muted}}>▊</span>
    </div>
    <div style={{padding: `12px ${PAD}px 30px`}}>
      <Statusline
        state={storyById('whole-line').at(STILL_PROGRESS)}
        fontSize={fontSize}
      />
    </div>
    <div style={{color: page.brand, padding: `0 ${PAD}px 26px`, fontSize: 14}}>
      ⏵⏵ bypass permissions on{' '}
      <span style={{color: page.faint}}>
        (shift+tab to cycle) · ← for agents
      </span>
    </div>
  </>
);

export type SocialProps = {
  /** Font size for the docked statusline — sized so the whole line fits the card. */
  statuslineFontSize: number;
};

/**
 * The 1280×640 social preview: the landing page's above-the-fold view. The
 * headline is what survives being scaled down to a timeline thumbnail; the
 * docked line underneath is the proof, legible at full size.
 */
export const Social: React.FC<SocialProps> = ({statuslineFontSize}) => (
  // The frame is a terminal, so every word in it is monospace. `Statusline` sets
  // its own family; everything else here would otherwise inherit the browser
  // default and render serif.
  <AbsoluteFill
    style={{backgroundColor: colors.background, padding: 28, fontFamily}}
  >
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: page.app,
        border: '1px solid #2a2a2a',
        borderRadius: 14,
        overflow: 'hidden',
        fontSize: 15,
        color: page.fg,
      }}
    >
      <Head />
      <Hint />

      <div style={{padding: `36px ${PAD}px 0`}}>
        <h1
          style={{
            margin: 0,
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          A statusline for Claude Code.
        </h1>
        <p
          style={{
            margin: '16px 0 0',
            color: page.muted,
            fontSize: 16,
            lineHeight: 1.65,
            maxWidth: 780,
          }}
        >
          One bash script. Your folder and branch, the model, how full the
          context window is, and how much of your 5-hour, 7-day and Fable limits
          you have used.
        </p>
        <p style={{margin: '18px 0 0', color: page.brand, fontSize: 15}}>
          alp82/claude-statusline
        </p>
      </div>

      {/* Pushes the dock to the foot of the frame, as a statusline sits. */}
      <div style={{flex: 1}} />

      <Dock fontSize={statuslineFontSize} />
    </div>
  </AbsoluteFill>
);
