# Changelog

Notable changes, newest first. Dates instead of versions: the install one-liner
always serves `main`, so a date names a state of `main` better than a version
number would.

## 2026-08-24

### Added

- **The reasoning effort, next to the model.** The line now reads
  `★ Opus 5 1M · high`. The five levels the CLI reports are shortened to `low`,
  `med`, `high`, `xhi` and `max`, and a model with no effort setting shows the
  name alone.
- Each agent-panel row carries the same pair, between its token count and its
  description. On a narrow panel, the effort column drops first and the model
  column second, so the description keeps its room.

### Changed

- **Model names are shortened.** A leading `Claude ` is dropped and
  ` (1M context)` becomes ` 1M`, so `Opus 5 (1M context)` reads `Opus 5 1M`.
  The panel derives the same name from the model id the CLI sends there.
- **Long directory and branch names are truncated.** The two share a 34-column
  budget, which `STATUSLINE_LOC_MAX` overrides. While both fit, neither is
  shortened. When they do not fit, the branch loses its namespace first, then
  its tail, then the directory is cut. Cuts land on word boundaries.
- **The agent panel is drawn on a grid.** Every field is a column. The script
  reads the whole payload first, measures the name, model, and effort columns
  across all the rows, and pads to them, so the bars, numbers, and descriptions
  line up whatever the agent names are. A column is dropped for every row at
  once, never for one row alone. Both mockups measure the same widths.
- The agent-panel loop is rendered wider (1680px) to hold the two new fields,
  and its crop on the landing page is wide for the same reason.
- **The walkthrough is re-cut.** The agent panel moves up to 03. A new 04,
  "The start of the line", shows the folder, branch, model, and effort as a
  loop: a branch name grows until it no longer fits, is cut, and then the
  folder is cut too as the model and effort change. "When a window resets" is
  gone. The Fable section shows the same turnover, and the fact that section
  carried - both halves drop to zero and the countdown restarts - now sits in
  01. Each section is down to a line or two, and the loops show the rest. The
  README follows the same order. `loop-reset` is no longer rendered. Its files
  stay in `docs/assets/`, where a frozen prototype still points at them.

### Fixed

- A non-object `effort` in the statusline JSON no longer takes the whole line
  down with it, and a model display name starting with `-` is no longer eaten
  as an `echo` flag.
- `STATUSLINE_LOC_MAX` is checked before it reaches an arithmetic context, so a
  typo can neither disable trimming with an error nor evaluate as an
  expression.
- The location budget is spent in full when the branch is short or absent, and
  it counts the worktree glyph `⎇+`, which is a column wider than `⎇`.
- The panel survives a non-integer `columns` (a failed arithmetic assignment
  used to abort the script and blank the panel), skips a task with no id
  instead of shifting every field by one, keeps the effort label for an agent
  whose model is unknown, and no longer reserves description room on a row that
  has no description.
- The model id parser reads `claude-3-opus-…` as `Opus 3` rather than
  `Opus 20240229`, and keeps a two-digit minor version.
- Widths are counted in terminal columns, not characters: a CJK or emoji name
  takes two columns per glyph, which the budget and the panel's columns now
  spend correctly. Under a non-UTF-8 locale, where bash counts bytes, a
  non-ASCII name is left whole rather than cut mid-sequence.
- An empty payload no longer writes a `jq` error to stderr.

## 2026-08-22

### Changed

- The install prompt now reads "Install or update the statusline …", and the
  README and landing page say plainly that the same prompt does both: paste it
  the first time to install, paste it again for the latest version. The
  installer's `--help` says the same.

## 2026-08-14

### Added

- **Per-agent context bars.** A second script, `subagent-statusline.sh`, renders
  the rows in the agent panel below the prompt. Each running subagent gets its
  own context bar, percentage, and token count in the same palette as the main
  line. Needs Claude Code v2.1.205 or later. The installer now ships both
  scripts and wires both settings entries.
- Section 06 on the landing page shows the panel as a live loop, and the
  `remotion/` sub-project renders the same loop to `docs/assets/loop-agents.gif`.

## 2026-07-30

### Added

- A linked git worktree shows an amber `⎇+` instead of `⎇`.

### Changed

- The top row of each stacked bar is colored by pace (usage against elapsed
  time), not by usage alone. Green means quota to spare, yellow means on pace,
  red means the window runs out early.

## 2026-07-28

### Added

- The rendered loops carry the race annotation: the racers named, the gap read
  out, and the effort row under the burn loop.

## 2026-07-27

### Changed

- The `Ctx` segment shows the token count in thousands next to the percentage.
- The Fable segment drops its `↻` countdown. It resets with the 7-day window,
  which already shows that time.

## 2026-07-26

### Added

- macOS support: BSD `stat`, BSD `date`, and the OAuth token from the Keychain.
- `--uninstall` for the installer, with backups for everything it removes.

## 2026-07-25

### Added

- The one-liner installer at `docs/install.sh`.
- The landing page at [alp82.github.io/claude-statusline](https://alp82.github.io/claude-statusline/).
- The `remotion/` sub-project that renders the animated loops.

## 2026-07-21

### Added

- `statusline.sh`: directory and branch, model, context bar, and the stacked
  5-hour, 7-day, and Fable limit bars.
