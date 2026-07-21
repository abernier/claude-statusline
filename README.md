<div align="center">

# claude-statusline

## dir ⎇branch · ★ Model · Ctx · 5h · 7d · Fable — at a glance

[![Stars, Forks, Open Issues and License](https://shieldcn.dev/group/github/stars/alp82/claude-statusline+github/forks/alp82/claude-statusline+github/open-issues/alp82/claude-statusline+github/license/alp82/claude-statusline.svg?variant=secondary)](https://github.com/alp82/claude-statusline)

[![Claude Code](https://shieldcn.dev/badge/Claude-Code-D97757.svg?logo=anthropic&variant=branded&size=lg)](https://claude.com/claude-code)
[![Statusline](https://shieldcn.dev/badge/statusline-bash-D97757.svg?variant=outline&size=lg)](https://code.claude.com/docs/en/statusline.md)
[![Dependencies](https://shieldcn.dev/badge/needs-jq%20·%20curl-D97757.svg?variant=outline&size=lg)](#requirements)

<br>

A single-file Bash statusline for **Claude Code**. It renders your working
directory and git branch, the active model, context-window usage, and your
rate-limit windows — 5-hour, 7-day, and the Fable weekly quota — as compact
color-coded bars.

</div>

---

## What it shows

```
myproject ⎇ main │ ★ Opus 4.8 │ Ctx ▓▓░ 9% │ 5h ▓░░ 4% ↻2h │ 7d ▓▓░ 16% ↻3d10h
```

- **dir ⎇ branch** — current directory basename and git branch
- **★ Model** — the active model's display name
- **Ctx** — context-window usage, 0–100%
- **5h / 7d** — rate-limit windows as a *stacked* bar: usage (green→yellow→red)
  over time-elapsed-in-window (blue). Usage sticking out past the blue means
  you're burning through the window faster than the clock. `↻` shows time to reset.
- **Fable** — the Fable weekly-scoped quota, pulled from the OAuth usage endpoint
  (cached, fetched at most every 10 min so it stays out of the TUI's way)

Colors: green `< 60%`, yellow `< 85%`, red `≥ 85%`.

## Install

```sh
git clone https://github.com/alp82/claude-statusline ~/alp/projects/claude-statusline
ln -s ~/alp/projects/claude-statusline/statusline.sh ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh
```

Then point Claude Code at it in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

## Requirements

- `bash`
- [`jq`](https://jqlang.github.io/jq/) — parses the statusline JSON from stdin
- `curl` — only for refreshing the Fable weekly quota

## How it works

Claude Code pipes a JSON blob to the script on stdin ([docs](https://code.claude.com/docs/en/statusline.md)).
Everything but the Fable window comes straight from that payload. The Fable
weekly quota isn't in it, so the script reads the CLI's own cached copy from
`~/.claude.json` and only hits `/api/oauth/usage` itself (in the background,
throttled) when that copy is stale.

## License

MIT
