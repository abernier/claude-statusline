// Rendered assets get committed to the repo, so the typeface must not depend on
// what happens to be installed on the machine doing the render. Bundling the
// webfont is what makes two people's renders come out identical.
//
// The tail of the stack still matters: JetBrains Mono does not cover every glyph
// the script prints (`⎇`, `⏵`), and the browser falls back per glyph.

import {loadFont} from '@remotion/google-fonts/JetBrainsMono';

const {fontFamily: jetBrainsMono} = loadFont('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
});

export const monoFontFamily = `${jetBrainsMono}, 'DejaVu Sans Mono', 'Liberation Mono', ui-monospace, monospace`;
