#!/usr/bin/env bash
# claude-statusline installer — https://github.com/alp82/claude-statusline
#
#   curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash
#
# Lives in docs/ because docs/ is the GitHub Pages root — that is what makes the
# one-liner above short. It is the only copy; the raw.githubusercontent URL
# (…/main/docs/install.sh) serves the same file.
#
# Drops statusline.sh into your Claude Code config dir and points settings.json
# at it. Idempotent: re-running upgrades in place. Anything it overwrites is
# backed up next to the original first.

set -euo pipefail

REPO="alp82/claude-statusline"
REF="${CLAUDE_STATUSLINE_REF:-main}"
CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
PATCH_SETTINGS=1

if [[ -t 1 ]]; then
  BOLD=$'\033[1m'; DIM=$'\033[38;2;138;138;138m'; CLAY=$'\033[38;2;217;119;87m'
  GREEN=$'\033[38;2;140;194;74m'; RED=$'\033[38;2;220;60;60m'
  RESET=$'\033[0m'
else
  BOLD=''; DIM=''; CLAY=''; GREEN=''; RED=''; RESET=''
fi

step() { printf '%s→%s %s\n' "$CLAY" "$RESET" "$*"; }
ok()   { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$RED" "$RESET" "$*" >&2; }
die()  { printf '%s✗%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

usage() {
  cat <<EOF
${BOLD}claude-statusline installer${RESET}

  curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash
  curl -fsSL https://alp82.github.io/claude-statusline/install.sh | bash -s -- --no-settings

Options:
  --dir <path>     Claude Code config dir (default: \$CLAUDE_CONFIG_DIR or ~/.claude)
  --ref <ref>      branch or tag to install from (default: $REF)
  --no-settings    install the script only; print the settings.json snippet
                   instead of writing it
  -h, --help       this help
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --dir)          CONFIG_DIR=${2:?--dir needs a path}; shift 2 ;;
    --ref)          REF=${2:?--ref needs a ref}; shift 2 ;;
    --no-settings)  PATCH_SETTINGS=0; shift ;;
    -h|--help)      usage; exit 0 ;;
    *)              usage >&2; die "unknown option: $1" ;;
  esac
done

# Claude Code runs the statusLine command from the *project* directory, so a
# relative path would resolve nowhere and the statusline would silently never
# render. Anchor it here, while $PWD still means what the user typed it against.
[[ $CONFIG_DIR == /* ]] || CONFIG_DIR="$PWD/${CONFIG_DIR#./}"

# REF is interpolated into a URL, and curl removes dot-segments before the
# request — so `--ref ../../someone-else/repo/main` would quietly escape the
# REPO pin above while the printed URL still reads as this repo.
[[ $REF =~ ^[A-Za-z0-9._/-]+$ && $REF != *..* ]] || die "invalid --ref: $REF"

# A commit SHA is not the pin it looks like: raw.githubusercontent serves any
# object in the repo's *fork network* under this repo's path, so a fork's SHA
# fetches the fork's code from a URL that still reads as ours. Branch and tag
# names resolve per-repo and cannot, which is all --ref ever advertised.
# Case-insensitive and down to 4 chars: raw.githubusercontent resolves an
# uppercased SHA and any unambiguous short prefix just as readily. The cost is
# that an all-hex tag of 4-40 chars is unusable — such a string *is* a valid
# short SHA, so there is nothing to tell them apart by.
if [[ $REF =~ ^[0-9a-fA-F]{4,40}$ ]]; then
  die "invalid --ref: $REF — branch or tag names only, not commit SHAs."
fi

# --- dependencies -----------------------------------------------------------
# jq parses the statusline JSON on every render, so it is a hard requirement of
# the script itself, not just of this installer.
for dep in curl jq; do
  command -v "$dep" >/dev/null 2>&1 \
    || die "$dep is required (statusline.sh needs it too) — install it and re-run."
done

TARGET="$CONFIG_DIR/statusline.sh"
SETTINGS="$CONFIG_DIR/settings.json"
SOURCE_URL="https://raw.githubusercontent.com/$REPO/$REF/statusline.sh"

# A symlinked settings.json means a dotfile manager (stow/chezmoi/yadm) owns it.
# Unlike $TARGET below, follow this one: it points at the user's own config, so
# writing through the link keeps their repo the source of truth. Replacing the
# link with a regular file would strand the wiring at the next `stow`/`apply`.
if [[ -L $SETTINGS ]]; then
  resolved=$(readlink -f "$SETTINGS" 2>/dev/null) || resolved=''
  [[ -n $resolved ]] && SETTINGS=$resolved
fi

# Claude Code runs statusLine.command *in a shell* — that is why the documented
# ~/.claude/statusline.sh form works at all. So a config dir containing spaces
# has to arrive quoted, or the shell word-splits it and the statusline silently
# never renders. Paths needing no quoting stay bare, so existing installs still
# compare equal and re-running remains a no-op.
if [[ $TARGET == *[^A-Za-z0-9._/-]* ]]; then
  CMD="'${TARGET//\'/\'\\\'\'}'"
else
  CMD=$TARGET
fi

settings_snippet() {
  jq -n --arg cmd "$CMD" '{statusLine: {type: "command", command: $cmd}}'
}

# --- fetch ------------------------------------------------------------------
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

step "fetching statusline.sh @ $REF"
curl -fsSL --connect-timeout 10 --max-time 120 "$SOURCE_URL" -o "$tmp" \
  || die "download failed: $SOURCE_URL"
[[ -s $tmp ]] || die "downloaded an empty file from $SOURCE_URL"
head -n 1 "$tmp" | grep -q '^#!/usr/bin/env bash$' \
  || die "$SOURCE_URL did not look like the statusline script"

# --- install ----------------------------------------------------------------
# 0700: the config dir holds settings.json, which routinely carries API keys.
mkdir -p -m 700 "$CONFIG_DIR"

if [[ -L $TARGET ]]; then
  # The old README recipe symlinked this at a git clone. Writing through the
  # link would clobber the clone (including uncommitted work), so break it
  # instead — but say so, because that clone stops being what Claude Code loads.
  warn "$TARGET was a symlink → $(readlink "$TARGET")"
  warn "replacing it with a real file; that path is no longer what Claude Code loads."
elif [[ -e $TARGET ]] && ! cmp -s "$tmp" "$TARGET"; then
  cp -p "$TARGET" "$TARGET.bak"
  step "backed up existing script → $TARGET.bak"
fi
rm -f "$TARGET"
cp "$tmp" "$TARGET"
chmod +x "$TARGET"
ok "installed $TARGET"

# --- settings ---------------------------------------------------------------
wired=0
if (( PATCH_SETTINGS )); then
  had_settings=1
  created=1
  if [[ ! -f $SETTINGS ]]; then
    had_settings=0
    # A dangling symlink lands here with an unreachable target, so this can fail.
    (umask 077; printf '{}\n' > "$SETTINGS") 2>/dev/null || created=0
  fi

  # One jq call answers both questions: is the file parseable at all (exit
  # status), and is it a shape we can safely patch (stdout). An empty or `null`
  # settings.json is unusual but not corrupt — the write below normalises those
  # to an object — but a top-level array/string/number is not ours to rewrite.
  if (( ! created )); then
    warn "cannot write $SETTINGS — is it a symlink to somewhere that no longer exists?"
    warn "add this yourself:"
    settings_snippet
  elif ! shape=$(jq -r '
        if type == "object" or type == "null"
        then (.statusLine | type)
        else "root"
        end' "$SETTINGS" 2>/dev/null); then
    warn "$SETTINGS is not valid JSON — leaving it alone. Add this yourself:"
    settings_snippet
  elif [[ $shape == root ]]; then
    warn "$SETTINGS is not a JSON object — leaving it alone. Add this yourself:"
    settings_snippet
  elif [[ $shape =~ ^(array|string|number|boolean)$ ]]; then
    warn "$SETTINGS has a statusLine that is not an object — leaving it alone. Add this yourself:"
    settings_snippet
  else
    current=$(jq -r '.statusLine.command // ""' "$SETTINGS")
    # a previous install (or the old README recipe) may have written the tilde form
    if [[ $current == "$CMD" ]] \
      || { [[ $TARGET == "$HOME/.claude/statusline.sh" ]] && [[ $current == "~/.claude/statusline.sh" ]]; }; then
      ok "settings.json already points at it"
      wired=1
    else
      note=''
      if (( had_settings )); then
        cp -p "$SETTINGS" "$SETTINGS.bak"
        note=" ${DIM}(backup: $SETTINGS.bak)${RESET}"
        [[ -n $current ]] && step "replacing existing statusLine command ($current)"
      fi
      # Temp file beside the real settings.json (which may live in a dotfile
      # repo, see above) so the mv is a real rename(2), not a cross-device
      # copy — and out of world-writable /tmp.
      settings_tmp=$(mktemp "${SETTINGS%/*}/.settings.json.XXXXXX")
      trap 'rm -f "$tmp" "$settings_tmp"' EXIT
      jq -n --arg cmd "$CMD" \
        'input? // {} | .statusLine = {type: "command", command: $cmd}' "$SETTINGS" \
        > "$settings_tmp" || die "failed to update $SETTINGS"
      # mv carries the temp file's mode, so match the original first: a
      # settings.json deliberately kept at 0600 must not come back 0644.
      if ! chmod --reference="$SETTINGS" "$settings_tmp" 2>/dev/null; then
        # BSD chmod (macOS) has no --reference; read the mode with BSD stat.
        # -L: stat defaults to lstat(2), and a symlink's own mode is 0777 —
        # copying that onto a file holding API keys would publish it.
        mode=$(stat -Lf '%Lp' "$SETTINGS" 2>/dev/null) || mode=''
        [[ $mode =~ ^[0-7]{3,4}$ ]] || mode=600
        chmod "$mode" "$settings_tmp"
      fi
      mv "$settings_tmp" "$SETTINGS" || die "failed to update $SETTINGS"
      ok "wired up $SETTINGS$note"
      wired=1
    fi
  fi
else
  printf '\n%sAdd this to %s:%s\n' "$BOLD" "$SETTINGS" "$RESET"
  settings_snippet
fi

# --- done -------------------------------------------------------------------
printf '\n'
if (( PATCH_SETTINGS )) && (( ! wired )); then
  die "statusline.sh is installed, but $SETTINGS was not wired up — see above."
fi

if (( PATCH_SETTINGS )); then
  ok "${BOLD}Done.${RESET} Open a new Claude Code session to see the statusline."
else
  ok "${BOLD}Done.${RESET} Add the snippet above to $SETTINGS, then open a new Claude Code session."
fi
