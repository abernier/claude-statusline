# claude-statusline

A single-file Bash statusline for Claude Code (`statusline.sh`).

Settings live in `~/.statuslinerc` (override the path with `$STATUSLINE_RC`), sourced by both scripts before anything else; what the environment already carries wins, which the scripts do by capturing `export -p` before the source and re-applying it after — so a new setting needs no list kept in step. `GAUGE` is the form every gauge takes — `bar`, `meter` or `none` — and `GAUGE_CTX`/`GAUGE_5H`/`GAUGE_7D`/`GAUGE_FABLE` override it for one gauge; unset, they are `bar` everywhere and `meter` for Fable. `meter()` in `statusline.sh` is the single place that choice is made, and it emits the space before the gauge so that `none` leaves no empty column. `COUNTDOWN` (and `COUNTDOWN_5H`/`COUNTDOWN_7D`/`COUNTDOWN_FABLE`, the last defaulting to `none` because Fable's reset usually reads off the 7-day segment — usually, not always: the `weekly_scoped` entry carries its own `resets_at`) is the usage percentage a window reaches before its `↻` appears — `0` always, `none` never — read through `shows_countdown`, which guards a non-numeric threshold before it reaches an arithmetic context the way `STATUSLINE_LOC_MAX` does. The mockups have no rc to read: `docs/index.html` and `remotion/` draw the default, so a change to what the default looks like still has to be mirrored there.

`subagent-statusline.sh` renders the per-subagent rows in the agent panel (the `subagentStatusLine` setting). It copies the palette, the context thresholds, the bar geometry, the effort labels, `vglyph`, and the display-width helpers (`vis_len`, `vis_cut`, `wide`) from `statusline.sh` — change one, change the other. It reads `GAUGE_CTX` too, falling back to `GAUGE`: `CTX_CELLS` is the width that form implies and `GAUGE_CELLS` adds the space after it, both measured once so every row is drawn to the same grid. It shortens model names too, but from the model id the panel sends rather than from a display name. The agent panel is drawn three times: by the script, by `agentPanel()` in `docs/index.html` (story 03), and by `remotion/src/statusline/AgentPanel.tsx` (the `agents` story renders `docs/assets/loop-agents.gif`). All three draw the rows on one grid: every variable-width column — name, model, effort — is measured across all the rows and padded to that width. The story's ramps and turnover live in both `docs/index.html` and `remotion/src/stories.ts` — change one, change the other.

`remotion/` is a separate npm sub-project (React + Remotion, `node_modules` gitignored) that rebuilds the statusline as an animatable terminal mockup for the landing page and README. `statusline.sh` is the source of truth for its palette, thresholds and bar geometry — change one, change the other.

The location budget - how a long folder or branch name is shortened - is implemented three times: `statusline.sh`, `fitLocation()` in `docs/index.html`, and `fitLocation()` in `remotion/src/statusline/segments.ts`. The ladder is the same in all three - change one, change the others - but the budget it spends is not. The script derives it from the terminal, sizing the first row against `COLUMNS` minus the file and line groups. The two mockups draw on a fixed canvas with no terminal to ask, so both hold `LOC_MAX` at 34, which is what the elision loop was authored against.

The first row is space-between: the folder and the branch on the left, what changed in the tree pushed right so that its edge lands on the second row's last column. The script pads with spaces to that column, `docs/index.html` gives the two rows one width and lets flex do it, and `remotion/src/statusline/segments.ts` spreads over a fixed cell count (`spreadTo`). What the row shows - the file kinds, their colours, the two-space gap between them - is written in all three. Change one, change the others.

The docked line's working-tree state (`DEFAULTS` in `docs/index.html`) and the `line-start` loop's opening state (`OWN_TREE` in `remotion/src/stories.ts`) are the same numbers on purpose. Change one, change the other.

The annotation over a bar — the racers named, the gap read out, the effort row — is drawn twice: by `annotate()` in `docs/index.html` and by `remotion/src/statusline/Annotation.tsx`. The page measures the painted bar, the render computes it from `theme.ts`, and both carry the same pixel constants. Change one, change the other.

## Update guide

For every day where changes are made, update CHANGELOG.md.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`alp82/claude-statusline`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
