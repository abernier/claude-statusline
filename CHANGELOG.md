# Changelog

Notable changes, newest first. Dates instead of versions: the install one-liner
always serves `main`, so a date names a state of `main` better than a version
number would.

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
