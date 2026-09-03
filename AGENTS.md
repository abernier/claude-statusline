# claude-statusline

A single-file Bash statusline for Claude Code (`statusline.sh`).

`subagent-statusline.sh` renders the per-subagent rows in the agent panel (the `subagentStatusLine` setting). It copies the palette, the context thresholds, the bar geometry, the effort labels, and the display-width helpers (`vis_len`, `vis_cut`, `wide`) from `statusline.sh` — change one, change the other. It shortens model names too, but from the model id the panel sends rather than from a display name. The agent panel is drawn three times: by the script, by `agentPanel()` in `docs/index.html` (story 03), and by `remotion/src/statusline/AgentPanel.tsx` (the `agents` story renders `docs/assets/loop-agents.gif`). All three draw the rows on one grid: every variable-width column — name, model, effort — is measured across all the rows and padded to that width. The story's ramps and turnover live in both `docs/index.html` and `remotion/src/stories.ts` — change one, change the other.

`docs/` is a Jekyll site — GitHub Pages builds it from path `/docs`. `docs/index.html` is still one hand-written file with inline `<style>` and `<script>`, but it opens with front matter and a block of Liquid assigns. `site.github.repository_nwo`, supplied by `jekyll-github-metadata`, is the single source for the repository name, and the conventional project-page URL is derived from it without a network call. The one repository name spelled out is `canonical`, and only so the page can tell whether it is upstream — a fork adds `--repo <itself>` to every command, because the `install.sh` it serves still carries upstream's built-in default, and says in the sidebar and the footer whose fork it is. The by-hand `raw.githubusercontent` fetches use `HEAD`, while installer commands never emit `--ref`: both resolve the repository's default branch. `docs/_config.yml` names the plugin and turns the default theme off; `docs/Gemfile` pins the `github-pages` gem for builds outside GitHub Pages. Those builds set `PAGES_REPO_NWO` and need no GitHub token.

`remotion/` is a separate npm sub-project (React + Remotion, `node_modules` gitignored) that rebuilds the statusline as an animatable terminal mockup for the landing page and README. `statusline.sh` is the source of truth for its palette, thresholds and bar geometry — change one, change the other.

The location budget - how a long folder or branch name is shortened - is implemented three times: `statusline.sh`, `fitLocation()` in `docs/index.html`, and `fitLocation()` in `remotion/src/statusline/segments.ts`. The ladder is the same in all three - change one, change the others - but the budget it spends is not. The script derives it from the terminal, sizing the first row against `COLUMNS` minus the file and line groups. The two mockups draw on a fixed canvas with no terminal to ask, so both hold `LOC_MAX` at 34, which is what the elision loop was authored against.

The first row is space-between: the folder and the branch on the left, what changed in the tree pushed right so that its edge lands on the second row's last column. The script pads with spaces to that column, `docs/index.html` gives the two rows one width and lets flex do it, and `remotion/src/statusline/segments.ts` spreads over a fixed cell count (`spreadTo`). What the row shows - the file kinds, their colours, the two-space gap between them - is written in all three. Change one, change the others.

The docked line's working-tree state (`DEFAULTS` in `docs/index.html`) and the `line-start` loop's opening state (`OWN_TREE` in `remotion/src/stories.ts`) are the same numbers on purpose. Change one, change the other.

The annotation over a bar — the racers named, the gap read out, the effort row — is drawn twice: by `annotate()` in `docs/index.html` and by `remotion/src/statusline/Annotation.tsx`. The page measures the painted bar, the render computes it from `theme.ts`, and both carry the same pixel constants. Change one, change the other.

`.claude-plugin/`, `hooks/` and `commands/` make the repository a Claude Code plugin marketplace holding one plugin — itself. The plugin adds no second implementation: its `SessionStart` hook runs `docs/install.sh --from "$CLAUDE_PLUGIN_ROOT"`, so the scripts and the settings wiring come from the same code the curl one-liner runs. Two things in `hooks/session-start.sh` are copies and have to stay in step with the installer: the shape of the command it writes (`$CONFIG_DIR/statusline.sh`, quoted when it needs it) and `is_ours` — the hook decides on its own whether a `statusLine` already in `settings.json` is ours, because it must stand down where the installer takes over. Change one, change the other. `plugin.json` carries no `version` on purpose: Claude Code falls back to the source commit, so every push to the default branch is an update, and adding a version would freeze that until it is bumped.

## Update guide

For every day where changes are made, update CHANGELOG.md.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`alp82/claude-statusline`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
