<div align="center">

# claude-statusline

## Are you spending faster than the clock?

[![Stars, Forks, Open Issues and License](https://shieldcn.dev/group/github/stars/alp82/claude-statusline+github/forks/alp82/claude-statusline+github/open-issues/alp82/claude-statusline+github/license/alp82/claude-statusline.svg?variant=secondary)](https://github.com/alp82/claude-statusline)

[![Claude Code](https://shieldcn.dev/badge/Claude-Code-D97757.svg?logo=anthropic&variant=branded&size=lg)](https://claude.com/claude-code)
[![Statusline](https://shieldcn.dev/badge/statusline-bash-D97757.svg?variant=outline&size=lg)](https://code.claude.com/docs/en/statusline.md)
[![Dependencies](https://shieldcn.dev/badge/needs-jq%20·%20curl-D97757.svg?variant=outline&size=lg)](#requirements)

<br>

One bash script. Each limit bar shows two things: how much you have used, and
how much time has passed. If usage is ahead of time, drop an effort level. If it
is behind, you can raise it. Your folder, branch, model, effort and context
window sit on the same line, under the prompt.

<br>

![The whole statusline from Ctx rightward, every window moving at once.](docs/assets/loop-whole-line.gif)

**[See it in motion → alp82.github.io/claude-statusline](https://alp82.github.io/claude-statusline/)**

</div>

---

## Install or update

One prompt does both. Paste it into Claude Code the first time to install the
statusline, and paste the same prompt again any time you want the latest
version. Claude installs or replaces the scripts, updates the settings, and
checks the result.

```text
Install or update the statusline from https://github.com/alp82/claude-statusline for me.
Run: curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash
Then check that bash, jq and curl are present, confirm ~/.claude/settings.json
points statusLine at ~/.claude/statusline.sh and subagentStatusLine at
~/.claude/subagent-statusline.sh, and tell me what to do next.
```

Claude reads the installer before it runs it and tells you what changed.

<details>
<summary>Or run the installer yourself</summary>

<br>

The same script without the agent. It installs the statusline, and updates it
if you already have it:

```sh
curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash
```

It puts `statusline.sh` and `subagent-statusline.sh` into `~/.claude/`, makes
them executable, and points `settings.json` at them. It copies anything it
replaces to `<file>.bak` first. Run it again to upgrade. `--no-settings`
installs the scripts only. `--help` lists all options.

</details>

<details>
<summary>Or install it by hand</summary>

<br>

Two files, nothing else:

```sh
curl -fsSL https://raw.githubusercontent.com/alp82/claude-statusline/main/statusline.sh \
  -o ~/.claude/statusline.sh
curl -fsSL https://raw.githubusercontent.com/alp82/claude-statusline/main/subagent-statusline.sh \
  -o ~/.claude/subagent-statusline.sh
chmod +x ~/.claude/statusline.sh ~/.claude/subagent-statusline.sh
```

Then add this to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "refreshInterval": 5
  },
  "subagentStatusLine": {
    "type": "command",
    "command": "~/.claude/subagent-statusline.sh"
  }
}
```

`refreshInterval` re-runs the line every five seconds on top of the usual
event-driven updates. Without it the file and line counts go stale whenever a
subagent writes to the tree while the session is idle, and the `↻` countdowns
only move when something else happens. Raise it on a large repository, where
`git status` is the slowest part of a render.

</details>

## Uninstall

The same prompt in reverse:

```text
Uninstall the statusline from https://github.com/alp82/claude-statusline for me.
Run: curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash -s -- --uninstall
Then confirm ~/.claude/statusline.sh and ~/.claude/subagent-statusline.sh are gone,
confirm ~/.claude/settings.json has no statusLine or subagentStatusLine entry,
and show me which .bak files it left behind.
```

<details>
<summary>Or run it yourself</summary>

<br>

```sh
curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash -s -- --uninstall
```

It removes both scripts from `~/.claude/`, the `statusLine` and
`subagentStatusLine` entries in `settings.json`, and the cache under
`~/.claude/cache/`. It backs up the scripts and `settings.json` as `.bak`
first. It changes nothing else, and it leaves an entry alone if it points at
another statusline. It leaves `~/.statuslinerc` alone. `--no-settings`
removes the scripts only.

</details>

## Settings

Optional: everything works without a config file. `~/.statuslinerc` is there
when you want to change what the second row draws.

Both scripts source it, so it is plain shell — one assignment per line, `#`
for a comment. What the environment already carries wins over the file, so
`GAUGE=none claude` tries a setting for one session without editing anything.
Point `STATUSLINE_RC` at another path to read another file.

```sh
# ~/.statuslinerc
GAUGE=meter                       # the form every gauge takes — see below
GAUGE_CTX=bar                     # …except this one
COUNTDOWN=80                      # only show ↻ from 80% used
STATUSLINE_LOC_MAX=34             # pin the first row's name budget
CLAUDE_STATUSLINE_NO_KEYCHAIN=1   # never ask the Keychain for the token
```

### GAUGE

Every gauge takes one of three forms, and `GAUGE` names it:

- `bar` — the 10-cell track
- `meter` — the compact vertical meter Fable uses: usage height beside the
  window's clock, in eighths, on the same dark track
- `none` — no gauge at all. The percentage carries the segment on its own.

```text
GAUGE unset (as it ships)  Ctx ███░░░░░░░ 28% 90k │ 5h ▀▀░░░░░░░░ 4% ↻2h │ 7d ▀▀▀░░░░░░░ 16% ↻3d10h │ Fable ▁▅ 8%
GAUGE="meter"              Ctx ▃ 28% 90k │ 5h ▁▅ 4% ↻2h │ 7d ▂▄ 16% ↻3d10h │ Fable ▁▅ 8%
GAUGE="none"               Ctx 28% 90k │ 5h 4% ↻2h │ 7d 16% ↻3d10h │ Fable 8%
GAUGE="bar"                Ctx ███░░░░░░░ 28% 90k │ 5h ▀▀░░░░░░░░ 4% ↻2h │ 7d ▀▀▀░░░░░░░ 16% ↻3d10h │ Fable █░░░░░░░░░ 8%
```

`GAUGE_CTX`, `GAUGE_5H`, `GAUGE_7D` and `GAUGE_FABLE` name one gauge each and
win over `GAUGE`, so you can fold the row and keep one track:

```sh
GAUGE=meter
GAUGE_CTX=bar
```

Left alone, they are the row as it ships: bars, and the meter for Fable, whose
window is secondary enough to get a glance rather than a track. Setting `GAUGE`
governs every gauge, Fable included — `GAUGE=none` really does strip the whole
row down to its numbers.

The percentages never move: they carry the exact number whichever form the
gauge takes, and they keep their own absolute colors.

A gauge with no window time to plot draws a single column instead of two —
`ctx`, which has no clock, and a limit window that arrives without a reset
time. It then takes the percentage's color rather than the pace color, the
same way its bar does.

`GAUGE_CTX` reaches the agent panel too: it is the form of every subagent's
context gauge, and the rows are drawn to whatever width it implies.

### COUNTDOWN

The `↻` on a limit window says how long until it resets. `COUNTDOWN` is the
usage percentage a window has to reach before it shows it: `0`, the default,
shows it always, and `none` never does.

```text
COUNTDOWN unset / 0   5h ▀▀░░░░░░░░ 4% ↻2h │ 7d ▀▀▀░░░░░░░ 16% ↻3d10h
COUNTDOWN="80"        5h ▀▀░░░░░░░░ 4% │ 7d ▀▀▀░░░░░░░ 16%          ← under the threshold
COUNTDOWN="80"        5h ████████▌░ 85% ↻2h │ 7d ▀▀▀░░░░░░░ 16%     ← 5h has crossed it
COUNTDOWN="none"      5h ▀▀░░░░░░░░ 4% │ 7d ▀▀▀░░░░░░░ 16%
```

`COUNTDOWN_5H`, `COUNTDOWN_7D` and `COUNTDOWN_FABLE` name one window each and
win over `COUNTDOWN`, the way `GAUGE_<ID>` does — `COUNTDOWN=none
COUNTDOWN_5H=0` keeps the 5-hour clock and drops the others.

`COUNTDOWN_FABLE` defaults to `none`, which is the row as it has always been:
Fable's reset usually lands close enough to the 7-day one that the segment
before it reads for both. That is a habit rather than a rule — the usage
payload gives the Fable window a `resets_at` of its own, and the two can say
different things:

```text
COUNTDOWN_FABLE="0"   7d ▀▀▀░░░░░░░ 16% ↻3d9h │ Fable ▅▃ 62% ↻4d0h
```

So turn it on if you actually use Fable. There is no `COUNTDOWN_CTX`: the
context window is a size, not a window in time, and has nothing to count down
to.

## What it shows

Two rows, with a blank row between them. The first is the checkout and what
has changed in it. The second is the model and the bars.

The first row is laid out space-between: the checkout on the left, what changed
pushed right so that its edge lines up with the end of the second row.

```text
claude-statusline ⎇ main                             3 mod │ +182 -47

★ Opus 5 1M · max │ Ctx ███░░░░░░░ 28% 90k │ 5h … │ 7d … │ Fable ▀▀░░░░░░░░ 8%
```

### The first row

- **dir ⎇ branch** — the directory name and the git branch. In a linked
  [git worktree](https://git-scm.com/docs/git-worktree) the glyph is an amber
  `⎇+`:

  ```text
  claude-statusline ⎇ main          ← the main checkout
  claude-statusline-fix ⎇+ fix/bar  ← a linked worktree
  ```

  The two share whatever the first row has left after the file and line
  groups, which on a normal terminal is most of the width. While both fit,
  neither is shortened. When they do not fit, the branch loses its namespace
  first, then its tail, then the directory is cut:

  ```text
  claude-statusline ⎇ f/context-win…   ← feature/context-window-bar-redesign
  acme-platform-web… ⎇ a/issue-214…    ← alp82/issue-214-truncate-long-names
  ```

  Claude Code passes the terminal width in `COLUMNS`, which requires v2.1.153
  or later. Without it the budget is a fixed 64 columns minus the groups. It
  never falls below 24 columns, however narrow the terminal. To pin it to a
  fixed number, set `STATUSLINE_LOC_MAX` (in the environment or in
  `~/.statuslinerc`), which overrides both. Widths are
  measured in terminal columns: a CJK or emoji glyph counts as two.
- **3 mod** — how many files changed, by kind: `add`, `mod`, `del`, and `?`
  for untracked. The count carries the weight and the color; the label stays
  gray, so a row of counts reads as numbers first. Staged and unstaged both
  count. A kind with no files is left out, so a few ordinary edits read
  `3 mod`, and a clean tree shows the directory alone. A new directory counts
  as one untracked entry, the way `git status` reports it.
- **+182 -47** — lines added and lines removed against the last commit.
  Untracked files have no line counts, so a tree holding nothing but new
  files shows the file kinds and no line counts.

### The second row

- **★ Model · effort** — the active model, shortened (`Opus 5 (1M context)`
  becomes `Opus 5 1M`), and the reasoning effort: `low`, `med`, `high`, `xhi`,
  or `max`. A model without an effort setting shows the name alone.
- **Ctx** — how full the context window is, 0–100%, and the token count in
  thousands
- **5h / 7d** — the 5-hour and 7-day rate-limit windows: usage, elapsed time,
  and `↻` the time until the reset, which [`COUNTDOWN`](#countdown) can hold
  back until the window is far enough along
- **Fable** — the same for the Fable weekly quota. It shows no `↻` of its own
  unless [`COUNTDOWN_FABLE`](#countdown) asks for one

## How to read it

### Usage against time

![The 5h bar: usage climbs past the blue elapsed-time half at high effort and turns red, then flattens at low effort. The clock overtakes it and the bar turns yellow, then green. A row under the bar records the effort level for each tenth of the window.](docs/assets/loop-burn.gif)

The top half of each bar shows usage. The bottom half shows elapsed time. When
the bar turns red, lower the effort level.

At the reset, both halves drop to zero and the countdown restarts at 5h0m.

#### Colors

The bar color compares usage with elapsed time:

- 🟩 quota to spare: raise model or effort
- 🟨 on pace: keep as is
- 🟥 runs out early: lower model or effort

The number color shows usage: 🟩 under 50% · 🟨 50–80% · 🟥 over 80%

### Context window

![The Ctx bar filling to 78%, turning yellow then red, then compacting back down to the summary.](docs/assets/loop-context.gif)

The bar turns yellow at 25% and red at 50%. Start a new session at yellow.
Answers get worse as the window fills.

### The agent panel

Claude Code lists running subagents below the prompt. Each subagent shows its
own context bar, model, and effort.

![Three agent rows, each with its own context bar, model and effort: one holds at 34%, one climbs into red, one starts late and stays green.](docs/assets/loop-agents.gif)

On a narrow panel, the effort column drops first and the model column second.
Requires Claude Code v2.1.205 or later. [`GAUGE_CTX`](#gauge) sets the form of
the context gauge here too.

### The Fable window

![The Fable meter: two columns, the red usage height at full while the blue week-elapsed column climbs to the reset, then both drop to the floor.](docs/assets/loop-fable.gif)

Fable has its own weekly quota. The limit is usually lower than for other
models, so it gets a glance instead of a track: two columns, your usage beside
the week's clock, and the exact number in the percentage. Fable resets with
the 7-day window, so it shows no `↻` of its own — though it has a reset time of
its own in the payload, and [`COUNTDOWN_FABLE`](#countdown) puts it back on the
row. It is the one gauge drawn as a meter by default — [`GAUGE`](#gauge)
decides the form of all four.

Claude Code does not send this value. The script reads it from `~/.claude.json`
and refreshes it from the API in the background, at most every ten minutes.

On macOS the refresh reads the OAuth token from the Keychain, because Claude
Code stores it there instead of in `~/.claude/.credentials.json`. The first
read can open a Keychain dialog. Click **Always Allow** once and it stops
asking. To skip the Keychain, set `CLAUDE_STATUSLINE_NO_KEYCHAIN=1` in the
environment or in `~/.statuslinerc`. The Fable bar then uses only the CLI's own
cache.

### Repo and git state

![The first row of the statusline: the folder and the branch hold still on the left while the working-tree counts fill up on the right — files modified, added, deleted and untracked, then the lines — until a commit empties them and the count starts again. The gap between the two never closes.](docs/assets/loop-line-start.gif)

The first row answers what you are working on and what you have done to it: the
folder and the branch on the left, then how many files changed by kind and how
many lines, pushed right so that its edge lands where the second row ends. Long
folder and branch names are cut to fit; the counts keep their room.

## Requirements

- `bash`
- [`jq`](https://jqlang.github.io/jq/) — parses the statusline JSON from stdin
- `curl` — only for refreshing the Fable weekly quota

## How it works

Claude Code sends JSON to the script on stdin
([docs](https://code.claude.com/docs/en/statusline.md)). Everything except the
Fable window comes from that payload. For the Fable quota the script reads the
CLI's cached copy in `~/.claude.json`. When that copy is stale, it calls
`/api/oauth/usage` in the background, at most every ten minutes.

The agent panel works the same way: Claude Code sends the visible subagent
rows to `subagent-statusline.sh` as one JSON object, and the script answers
with one replacement row per agent.

The main line uses the model's display name from the payload. The panel
receives a model id and derives the short name from it. Effort also comes from
the payload, on the versions that send it and for the models that support it.
Without it, the line shows the model name alone.

Changes are listed in the [changelog](CHANGELOG.md).

## License

MIT
