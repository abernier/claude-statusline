<div align="center">

# claude-statusline

## Are you spending faster than the clock?

[![Stars, Forks, Open Issues and License](https://shieldcn.dev/group/github/stars/alp82/claude-statusline+github/forks/alp82/claude-statusline+github/open-issues/alp82/claude-statusline+github/license/alp82/claude-statusline.svg?variant=secondary)](https://github.com/alp82/claude-statusline)

[![Claude Code](https://shieldcn.dev/badge/Claude-Code-D97757.svg?logo=anthropic&variant=branded&size=lg)](https://claude.com/claude-code)
[![Statusline](https://shieldcn.dev/badge/statusline-bash-D97757.svg?variant=outline&size=lg)](https://code.claude.com/docs/en/statusline.md)
[![Dependencies](https://shieldcn.dev/badge/needs-jq%20·%20curl-D97757.svg?variant=outline&size=lg)](#requirements)

<br>

One bash script. Every limit window is a race between two things: the tokens you
spend, and the time you have left. The bar draws both. When your spend pulls
ahead of the clock, drop an effort level. When it falls behind, you can afford to
think harder. Your folder, branch, model and context window sit on the same line,
under the prompt, while you work.

<br>

![The whole statusline from Ctx rightward, every window moving at once.](docs/assets/loop-whole-line.gif)

**[See it in motion → alp82.github.io/claude-statusline](https://alp82.github.io/claude-statusline/)**

</div>

---

## Install

Paste this into Claude Code. It installs the script, wires Claude Code up to it,
and checks the result.

```text
Install the statusline from https://github.com/alp82/claude-statusline for me.
Run: curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash
Then check that bash, jq and curl are present, confirm ~/.claude/settings.json
points statusLine at ~/.claude/statusline.sh, and tell me what to do next.
```

Claude reads the installer before it runs it, tells you what changed, and fixes
anything missing. Re-paste it any time to upgrade.

<details>
<summary>Or run the installer yourself</summary>

<br>

Same script, no agent in the middle:

```sh
curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash
```

That drops `statusline.sh` into `~/.claude/`, makes it executable, and points
`settings.json` at it. Anything it replaces is copied to `<file>.bak` first —
your own `statusline.sh`, a symlink to a clone, an existing `settings.json`.
Re-run it any time to upgrade. `--no-settings` installs the script only
(`… | bash -s -- --no-settings`); `--help` has the rest.

</details>

<details>
<summary>Or install it by hand</summary>

<br>

One file, nothing else:

```sh
curl -fsSL https://raw.githubusercontent.com/alp82/claude-statusline/main/statusline.sh \
  -o ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh
```

Then point Claude Code at it yourself, in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

</details>

## Uninstall

The same prompt in reverse:

```text
Uninstall the statusline from https://github.com/alp82/claude-statusline for me.
Run: curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash -s -- --uninstall
Then confirm ~/.claude/statusline.sh is gone and ~/.claude/settings.json no longer
has a statusLine entry, and show me which .bak files it left behind.
```

<details>
<summary>Or run it yourself</summary>

<br>

```sh
curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash -s -- --uninstall
```

Deletes `~/.claude/statusline.sh`, drops the `statusLine` entry from
`settings.json` and clears the cached usage numbers under `~/.claude/cache/` —
backing up the script and `settings.json` as `.bak` first. Everything else in
`settings.json` is left as it was, and if `statusLine` points at some other
statusline it is left alone. `--no-settings` removes the script only.

</details>

## What it shows

Left to right:

- **dir ⎇ branch** — the current directory's name, and the git branch you are on.
  In a linked [git worktree](https://git-scm.com/docs/git-worktree) the glyph
  becomes an amber `⎇+`, so a worktree never looks like the main checkout:

  ```text
  claude-statusline ⎇ main          ← the main checkout
  claude-statusline-fix ⎇+ fix/bar  ← a linked worktree
  ```
- **★ Model** — the active model's display name
- **Ctx** — how full the context window is, 0–100%, and the token count in
  thousands
- **5h / 7d** — your 5-hour and 7-day rate-limit windows: how much you have used,
  how much of the window has gone by, and `↻` the time until it resets. The
  distance between the two halves is the number to read
- **Fable** — the same, for Fable's own weekly quota. It resets with the 7-day
  window, so it shows no `↻` of its own

## How to read it

### Usage against time

![The 5h bar with both racers named and the gap between them read out: spend climbs past the blue elapsed-time half at high effort and turns red, then flattens once the effort drops. The clock overtakes it and the bar turns yellow, then green. An effort row under the bar records which level was in force across each tenth of the window.](docs/assets/loop-burn.gif)

The top half of each cell is how much of the window you have used. The bottom
half is how much of the window has gone by. The distance between the two is the
number to read.

If the top reaches further right than the bottom, you are spending faster than
the clock and you will run out before the window resets. Drop an effort level and
the spend rate falls with it, which is what the loop above shows: high effort
until the gap opens, then low, and the clock catches back up and overtakes. The
bar walks back from red through yellow to green as it does. If the bottom
reaches further right, you are leaving quota you will not get back, so you can
afford to think harder.

The colour of the top half follows pace, not usage. Green means the top trails
the blue half. Yellow means the two are within five points of each other. Red
means the top leads, so you will run out before the reset. The percentage
number keeps the usage thresholds: green under 50%, yellow 50–80%, red above
80%.

### Context window

![The Ctx bar filling to 78%, turning yellow then red, then compacting back down to the summary.](docs/assets/loop-context.gif)

Turns yellow at 25% and red at 50% — sooner than the limit bars, because a full
context window stops you working right away. The bar fills in eighths of a
character, so it moves before the number does.

### When a window resets

![The 5h bar with the gap read out, creeping up, dropping to zero the instant the window resets, then climbing back.](docs/assets/loop-reset.gif)

At the end of a 5-hour window both halves drop back to zero, the percentage
goes back to green, and the countdown starts again at 5h0m. The top half of the
bar stays green through the creep: it trails the clock, so there is nothing to
warn about.

### The Fable window

![The Fable bar with the gap read out, at 100% and red, holding while the blue week-elapsed half runs to the reset.](docs/assets/loop-fable.gif)

Fable has its own weekly quota. Spend it early and nothing gives it back before
the week is over, so the blue half is the useful one: it tells you how long the
wait is. The window resets with the 7-day one, which is why it shows no `↻`.

Claude Code does not send this one. The script reads it from `~/.claude.json`
and only asks the API for a fresh value in the background, at most every ten
minutes — so it stays out of the TUI's way.

On macOS that refresh needs the OAuth token from the Keychain, because Claude
Code stores it there instead of in `~/.claude/.credentials.json`. The first read
can open a Keychain dialog. Click **Always Allow** once and it stops asking. To
skip the Keychain read altogether, set `CLAUDE_STATUSLINE_NO_KEYCHAIN=1` — the
Fable bar then follows the CLI's own cache only.

## Requirements

- `bash`
- [`jq`](https://jqlang.github.io/jq/) — parses the statusline JSON from stdin
- `curl` — only for refreshing the Fable weekly quota

## How it works

Claude Code pipes a JSON blob to the script on stdin
([docs](https://code.claude.com/docs/en/statusline.md)). Everything but the
Fable window comes straight from that payload. The Fable weekly quota isn't in
it, so the script reads the CLI's own cached copy from `~/.claude.json` and only
hits `/api/oauth/usage` itself — in the background, throttled — when that copy
is stale.

## License

MIT
