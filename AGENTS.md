# claude-statusline

A single-file Bash statusline for Claude Code (`statusline.sh`).

`subagent-statusline.sh` renders the per-subagent rows in the agent panel (the `subagentStatusLine` setting). It copies the palette, the context thresholds, and the bar geometry from `statusline.sh` — change one, change the other. The agent panel is drawn three times: by the script, by `agentPanel()` in `docs/index.html` (story 06), and by `remotion/src/statusline/AgentPanel.tsx` (the `agents` story renders `docs/assets/loop-agents.gif`). The story's ramps and turnover live in both `docs/index.html` and `remotion/src/stories.ts` — change one, change the other.

`remotion/` is a separate npm sub-project (React + Remotion, `node_modules` gitignored) that rebuilds the statusline as an animatable terminal mockup for the landing page and README. `statusline.sh` is the source of truth for its palette, thresholds and bar geometry — change one, change the other.

The annotation over a bar — the racers named, the gap read out, the effort row — is drawn twice: by `annotate()` in `docs/index.html` and by `remotion/src/statusline/Annotation.tsx`. The page measures the painted bar, the render computes it from `theme.ts`, and both carry the same pixel constants. Change one, change the other.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`alp82/claude-statusline`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
