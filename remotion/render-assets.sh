#!/usr/bin/env bash
# Render every landing-page / README asset into docs/assets/.
#
# There is no CI render pipeline (decided on map #1) — this script *is* the
# pipeline, so it has to be re-runnable by hand and produce byte-comparable
# output. That is why the webfont is bundled rather than taken from the system:
# see src/font.ts.
#
# Each loop is rendered twice:
#   .mp4  h264, full resolution — for <video> on the page, or a no-JS fallback
#   .gif  the same frames, 8-bit — the only media GitHub markdown will autoplay
#
# Usage: ./render-assets.sh [composition-id ...]   (default: everything)

set -euo pipefail

cd "$(dirname "$0")"

REMOTION=./node_modules/.bin/remotion
ENTRY=src/index.ts
OUT=../docs/assets

# Keep in step with src/compositions.ts, which is where the geometry lives.
LOOPS=(loop-burn loop-context loop-reset loop-fable loop-whole-line loop-agents)
STILLS=(social-preview)

mkdir -p "$OUT"

render_loop() {
  local id=$1
  echo "==> $id.mp4"
  "$REMOTION" render "$ENTRY" "$id" "$OUT/$id.mp4" --codec=h264 --log=error
  echo "==> $id.gif"
  # No --number-of-gif-loops: omitting it is what yields an infinite loop
  # (ffmpeg `-loop 0`). Passing 0 means "play once" — ffmpeg `-loop -1` — and
  # silently produces a GIF with no NETSCAPE2.0 block that stops on its last
  # frame. Verified by grepping the output for that block.
  "$REMOTION" render "$ENTRY" "$id" "$OUT/$id.gif" --codec=gif --log=error
}

render_still() {
  local id=$1
  echo "==> $id.png"
  "$REMOTION" still "$ENTRY" "$id" "$OUT/$id.png" --log=error
}

targets=("$@")
if [ ${#targets[@]} -eq 0 ]; then
  targets=("${LOOPS[@]}" "${STILLS[@]}")
fi

for id in "${targets[@]}"; do
  case " ${STILLS[*]} " in
    *" $id "*) render_still "$id" ;;
    *) render_loop "$id" ;;
  esac
done

echo
echo "Rendered into $OUT:"
ls -lh "$OUT" | tail -n +2
