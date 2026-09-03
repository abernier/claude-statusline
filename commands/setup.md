---
description: Install or repair the statusline wiring in settings.json
allowed-tools: Bash(bash:*), Read
---

# Wire up the statusline

The plugin normally does this by itself, at session start. Run this when it
stood down — because `settings.json` already pointed `statusLine` at another
command — or to repair a wiring that drifted.

Run the installer the plugin ships, from the plugin's own directory, so nothing
is downloaded:

```sh
bash "${CLAUDE_PLUGIN_ROOT}/docs/install.sh" --from "${CLAUDE_PLUGIN_ROOT}"
```

It copies `statusline.sh` and `subagent-statusline.sh` into the Claude Code
config dir and points `statusLine` and `subagentStatusLine` at them. Anything it
replaces is backed up to `<file>.bak` first — including a statusline that was
someone else's, so say which command was replaced and where its backup went.

Then tell the user the line appears on the next session.
