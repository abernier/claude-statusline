import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, fontFamily, lineHeight, metrics} from '../theme';

export type TypedCommentProps = {
  /** Written without the leading `# ` — the component adds it. */
  text: string;
  fontSize?: number;
  /** Typewriter cadence. The storyboards call for a fast ~25ms/char. */
  msPerChar?: number;
};

/**
 * The caption: a dim `# comment` typed inside the terminal chrome, above the
 * statusline. Captions are self-contained on purpose — the README GIF has no
 * page copy to lean on.
 *
 * Wrap in a `<Sequence>` to schedule it; the line clears when the sequence ends.
 */
export const TypedComment: React.FC<TypedCommentProps> = ({
  text,
  fontSize = metrics.fontSize,
  msPerChar = 25,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const full = `# ${text}`;
  const charsPerFrame = 1000 / fps / msPerChar;
  const typed = Math.max(
    0,
    Math.min(full.length, Math.floor(frame * charsPerFrame))
  );
  const done = typed >= full.length;
  // Blink only once the line has landed; a cursor jittering mid-word reads as noise.
  const cursorOn = !done || Math.floor(frame / (fps / 2)) % 2 === 0;

  return (
    <div
      style={{
        fontFamily,
        fontSize,
        lineHeight: `${lineHeight(fontSize)}px`,
        height: lineHeight(fontSize),
        color: colors.dim,
        whiteSpace: 'pre',
        opacity: 0.75,
      }}
    >
      {full.slice(0, typed)}
      {typed > 0 ? <span style={{opacity: cursorOn ? 1 : 0}}>▏</span> : null}
    </div>
  );
};
