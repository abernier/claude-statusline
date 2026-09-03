#!/usr/bin/env bash
# claude-statusline — the plugin's install and update step.
#
# A plugin cannot ship the statusline on its own: Claude Code reads statusLine
# from a settings file only, and a plugin's own settings.json is honoured for
# `agent` and `subagentStatusLine` alone. So the plugin does exactly what the
# curl one-liner does — it runs docs/install.sh — and this hook is what makes it
# run. Once when the plugin is enabled, and again after every plugin update,
# because ${CLAUDE_PLUGIN_ROOT} then points at the new version's directory:
# installed plugins live under a version-named path that changes with each
# release, which is also why settings.json cannot point at the plugin's own copy
# and the scripts still land in the config dir.
#
# Silence is the contract. A SessionStart hook's stdout is injected into the
# session as context, so the installer's output is captured and only reaches the
# user — on stderr, exit 2 — when something actually went wrong.

set -uo pipefail

root=${CLAUDE_PLUGIN_ROOT:?CLAUDE_PLUGIN_ROOT is not set — this runs as a plugin hook}
config_dir=${CLAUDE_CONFIG_DIR:-$HOME/.claude}
target="$config_dir/statusline.sh"
sub_target="$config_dir/subagent-statusline.sh"
settings="$config_dir/settings.json"

# jq is a hard requirement of statusline.sh itself, not just of the installer.
# Say so here, once, instead of letting install.sh fail at every session start.
command -v jq >/dev/null 2>&1 || {
  echo "claude-statusline: jq is not installed — statusline.sh parses its input with it." >&2
  exit 2
}

# Whatever settings.json points at today. The installer would back up a foreign
# statusLine and take the line over, which is the right answer for a command
# someone typed and the wrong one for a hook that runs on its own — so read it
# first and stand down rather than let install.sh decide.
current=''
if [[ -f $settings ]]; then
  current=$(jq -r '.statusLine.command // ""' "$settings" 2>/dev/null) || current=''
fi
case $current in
  '' | "$target" | "'$target'") ;;
  # The tilde form is what the old README recipe told people to paste; it is
  # ours whenever the config dir is the one it names.
  '~/.claude/statusline.sh') [[ $target == "$HOME/.claude/statusline.sh" ]] || current=foreign ;;
  *) current=foreign ;;
esac
if [[ $current == foreign ]]; then
  echo "claude-statusline: settings.json already points statusLine at another command," >&2
  echo "so the plugin left it alone. Run /claude-statusline:setup to hand the line over." >&2
  exit 2
fi

# The common case, on every session start after the first: both scripts already
# match the plugin's copy and the wiring is in place. Two cmp calls, no jq, no
# installer, nothing written.
if [[ -n $current ]] \
  && cmp -s "$root/statusline.sh" "$target" \
  && cmp -s "$root/subagent-statusline.sh" "$sub_target"; then
  exit 0
fi

if ! out=$(bash "$root/docs/install.sh" --from "$root" --dir "$config_dir" 2>&1); then
  echo "claude-statusline: the installer failed — the statusline is not wired up." >&2
  printf '%s\n' "$out" >&2
  exit 2
fi
