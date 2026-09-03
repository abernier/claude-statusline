---
description: Unwire the statusline before uninstalling the plugin
allowed-tools: Bash(bash:*), Read
---

# Remove the statusline

Uninstalling the plugin takes the plugin's copy away, but not the two scripts in
the config dir and not the `statusLine` entry that points at them — a plugin
cannot write settings.json on its way out. Left alone they keep rendering, from
a copy nothing updates any more. So unwire first:

```sh
bash "${CLAUDE_PLUGIN_ROOT}/docs/install.sh" --uninstall
```

It removes both scripts, drops `statusLine` and `subagentStatusLine` when they
still point at them, and backs up everything it touches. Report which `.bak`
files it left behind.

Then tell the user to run `/plugin uninstall claude-statusline` to remove the
plugin itself.
