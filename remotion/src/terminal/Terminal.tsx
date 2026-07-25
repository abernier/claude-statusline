import React from 'react';
import {AbsoluteFill} from 'remotion';
import {colors, lineHeight, metrics} from '../theme';

const DOTS = ['#ff5f57', '#febc2e', '#28c840'];

export type TerminalProps = {
  fontSize?: number;
  padding?: number;
  children: React.ReactNode;
};

/**
 * The fake terminal window every loop is shot inside: rounded chrome, three
 * dots, `#0d0d0d` body. Nothing else is ever in frame.
 */
export const Terminal: React.FC<TerminalProps> = ({
  fontSize = metrics.fontSize,
  padding = 24,
  children,
}) => {
  const barHeight = Math.round(lineHeight(fontSize) * 1.1);
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #1e1e1e',
      }}
    >
      <div
        style={{
          height: barHeight,
          flexShrink: 0,
          backgroundColor: '#161616',
          borderBottom: '1px solid #1e1e1e',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 16,
        }}
      >
        {DOTS.map((dot) => (
          <div
            key={dot}
            style={{
              width: fontSize * 0.42,
              height: fontSize * 0.42,
              borderRadius: '50%',
              backgroundColor: dot,
            }}
          />
        ))}
      </div>
      <div style={{position: 'relative', flex: 1}}>
        {/* Inset rather than padding: the body's children position themselves
            absolutely, and an absolute child resolves against the padding box. */}
        <div style={{position: 'absolute', inset: padding}}>{children}</div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Body layout for the standard shot: the statusline sits on the **bottom** line
 * of the terminal, as a statusline does, and the caption is typed at the top of
 * the body. Keeping them at opposite ends is what stops a 2× push-in — which
 * grows the line upward from its bottom anchor — from colliding with the
 * caption. The caption is also outside the camera layer, so it stays at true
 * scale and full legibility while the statusline is zoomed.
 */
export const TerminalBody: React.FC<{
  fontSize?: number;
  caption?: React.ReactNode;
  children: React.ReactNode;
}> = ({fontSize = metrics.fontSize, caption, children}) => (
  <div style={{position: 'absolute', inset: 0}}>
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: lineHeight(fontSize),
      }}
    >
      {caption}
    </div>
    {children}
  </div>
);
