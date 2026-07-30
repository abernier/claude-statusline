import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Statusline} from './statusline/Statusline';
import {barColumns, buildSegments} from './statusline/segments';
import {FIVE_WINDOW, WEEK_WINDOW, ctxTokens, remaining} from './stories';
import type {StatuslineState} from './statusline/types';
import {cellWidth, colors, ctxColor, fontFamily, paceColor, page} from './theme';

/**
 * One inline rhythm for every region in the frame — the craft rule carried over
 * from #4, where two competing padding systems was the worst visual bug in the
 * prototype. Everything below aligns to this single left edge.
 */
const PAD = 46;

/**
 * The docked line drops the Fable segment: 82 cells instead of 106, which is
 * what lets it render a third larger on a card read at thumbnail size.
 *
 * The three readings are hand-picked so each bar demonstrates the label under
 * it: context at 40%, the 5-hour spend ahead of its clock (red), the 7-day
 * spend behind its clock (green).
 */
const FIVE = {pct: 62, elapsed: 45};
const WEEK = {pct: 19, elapsed: 51};
const CTX = 40;

const dockState = (): StatuslineState => ({
  ctx: CTX,
  ctxTokens: ctxTokens(CTX),
  five: {...FIVE, resetsIn: remaining(FIVE.elapsed, FIVE_WINDOW)},
  week: {...WEEK, resetsIn: remaining(WEEK.elapsed, WEEK_WINDOW)},
});

const Head: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      padding: `26px ${PAD}px 0`,
    }}
  >
    <Img
      src={staticFile('claude-logo.svg')}
      style={{width: 48, height: 48, flex: 'none'}}
    />
    <span style={{color: '#f2f2f2', fontWeight: 700, fontSize: 24}}>
      Claude Code
    </span>
  </div>
);

/** What each bar says to do, in the pace colour the bar itself shows. */
const LABELS: {id: 'ctx' | 'five' | 'week'; color: string; text: string}[] = [
  {id: 'ctx', color: ctxColor(CTX), text: 'context rot — start a new chat'},
  {
    id: 'five',
    color: paceColor(FIVE.pct, FIVE.elapsed),
    text: 'ahead of the clock — dial thinking down',
  },
  {
    id: 'week',
    color: paceColor(WEEK.pct, WEEK.elapsed),
    text: 'behind the clock — crank thinking up',
  },
];

/**
 * One label under each bar, anchored to the bar's own start column — the same
 * cell grid the line is laid out on, so nothing is measured from the DOM.
 */
const Labels: React.FC<{fontSize: number}> = ({fontSize}) => {
  const segments = buildSegments(dockState());
  const cw = cellWidth(fontSize);
  return (
    <div
      style={{
        position: 'relative',
        height: 22,
        margin: `12px ${PAD}px 0`,
        fontSize: 15,
        whiteSpace: 'pre',
      }}
    >
      {LABELS.map(({id, color, text}) => {
        const bar = barColumns(segments, id);
        if (!bar) return null;
        return (
          <span
            key={id}
            style={{position: 'absolute', left: bar.start * cw, top: 0}}
          >
            <span style={{color}}>└ </span>
            <span style={{color: page.muted}}>{text}</span>
          </span>
        );
      })}
    </div>
  );
};

/**
 * The docked line, exactly where the real statusline renders: under the `⟩`
 * prompt, with the three labels where the mode line would sit.
 */
const Dock: React.FC<{fontSize: number}> = ({fontSize}) => (
  <>
    <div
      style={{
        borderTop: `1px solid #2b2b2b`,
        padding: `16px ${PAD}px`,
        display: 'flex',
        gap: 14,
        fontSize: 22,
      }}
    >
      <span style={{color: page.muted}}>⟩</span>
      <span style={{color: page.muted}}>▊</span>
    </div>
    <div style={{padding: `8px ${PAD}px 0`}}>
      <Statusline state={dockState()} fontSize={fontSize} glow={['five']} />
    </div>
    <Labels fontSize={fontSize} />
    <div style={{height: 26}} />
  </>
);

export type SocialProps = {
  /** Font size for the docked statusline — sized so the whole line fits the card. */
  statuslineFontSize: number;
};

/**
 * The 1280×640 social preview: a stripped-down Claude Code frame. The headline
 * is what survives being scaled down to a timeline thumbnail; the docked line
 * underneath is the proof, each bar captioned with the action it asks for.
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
        color: page.fg,
      }}
    >
      <Head />

      <div style={{padding: `34px ${PAD}px 0`}}>
        <h1
          style={{
            margin: 0,
            fontSize: 80,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.12,
          }}
        >
          A statusline
          <br />
          for Claude Code.
        </h1>
        <p
          style={{
            margin: '22px 0 0',
            color: page.muted,
            fontSize: 23,
            lineHeight: 1.5,
          }}
        >
          The racing bars tell you if your tokens will last until the reset.
        </p>
        <p style={{margin: '16px 0 0', color: page.brand, fontSize: 22}}>
          alp82/claude-statusline
        </p>
      </div>

      {/* Pushes the dock to the foot of the frame, as a statusline sits. */}
      <div style={{flex: 1}} />

      <Dock fontSize={statuslineFontSize} />
    </div>
  </AbsoluteFill>
);
