import React from 'react';
import {Composition, Still} from 'remotion';
import {Loop} from './Loop';
import {Scaffold} from './Scaffold';
import {Social} from './Social';
import {LOOP_COMPOSITIONS, LOOP_FPS, LOOP_FRAMES, SOCIAL} from './compositions';

/**
 * The walkthrough loops and the social-preview still (#6), plus the #3
 * scaffold, kept as the foundation smoke test.
 *
 * Every loop is seamless by construction: `Loop` derives its progress from
 * `frame % durationInFrames`, and every story returns to its start value at
 * p=1 — so the loop point is a property of the arcs, not of the duration.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {LOOP_COMPOSITIONS.map(({id, storyId, width, height, fontSize, annotate}) => (
      <Composition
        key={id}
        id={id}
        component={Loop}
        durationInFrames={LOOP_FRAMES}
        fps={LOOP_FPS}
        width={width}
        height={height}
        defaultProps={{storyId, fontSize, annotate}}
      />
    ))}

    <Still
      id={SOCIAL.id}
      component={Social}
      width={SOCIAL.width}
      height={SOCIAL.height}
      defaultProps={{statuslineFontSize: SOCIAL.statuslineFontSize}}
    />

    <Composition
      id="Scaffold"
      component={Scaffold}
      durationInFrames={300}
      fps={30}
      width={1200}
      height={300}
    />
  </>
);
