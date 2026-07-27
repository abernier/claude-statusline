#!/usr/bin/env bash
# Claude Code statusline: dir ⎇branch │ ★ Model │ Ctx ▓▓░ 9% 18k │ 5h ▓░░ 4% ↻2h │ 7d ▓▓░ 16% ↻3d10h
# Reads the statusline JSON from stdin (see https://code.claude.com/docs/en/statusline.md)

input=$(cat)

# Tab is an IFS whitespace character, so bash collapses a run of tabs: one
# empty field would shift every value after it. `d` keeps the text fields
# non-empty. A path cannot hold U+001F, so it stands in for "no directory"
# and is cleared right after the read.
IFS=$'\t' read -r model dir version ctx_pct ctx_tokens five_pct five_reset week_pct week_reset <<<"$(jq -r '
def d($fallback): if (. // "") == "" then $fallback else . end;
[
  (.model.display_name | d("?")),
  (.workspace.current_dir // .cwd | d("\u001f")),
  (.version | d("2.1.211")),
  (.context_window.used_percentage // -1 | round),
  ((.context_window.total_input_tokens // 0) + (.context_window.total_output_tokens // 0) | round),
  (.rate_limits.five_hour.used_percentage // -1 | round),
  (.rate_limits.five_hour.resets_at // 0),
  (.rate_limits.seven_day.used_percentage // -1 | round),
  (.rate_limits.seven_day.resets_at // 0)
] | @tsv' <<<"$input")"
[[ $dir == $'\x1f' ]] && dir=""

# --- Fable weekly window: not in the statusline JSON. Primary source is the
# CLI's own persisted copy of its last successful /api/oauth/usage fetch
# (cachedUsageUtilization in ~/.claude.json, kept fresh by the running TUI).
# Only when that is stale (>30 min) do we fetch the endpoint ourselves, in the
# background, at most every 10 min — its per-token quota is tiny and shared
# with the TUI, so we stay out of its way.
USAGE_CACHE="$HOME/.claude/cache/oauth-usage.json"
USAGE_STAMP="$HOME/.claude/cache/oauth-usage.attempt"
now_s=$(date +%s)
# GNU stat first: BSD stat (macOS) rejects -c cleanly, but GNU stat reads -f as
# --file-system and dumps the whole file system to stdout before it fails.
mtime() {
  local t
  t=$(stat -c %Y "$1" 2>/dev/null) || t=$(stat -f %m "$1" 2>/dev/null)
  [[ $t =~ ^[0-9]+$ ]] || t=0
  echo "$t"
}
file_age() { [[ -f "$1" ]] && echo $(( now_s - $(mtime "$1") )) || echo 999999; }

cache_ts=0; [[ -f "$USAGE_CACHE" ]] && cache_ts=$(mtime "$USAGE_CACHE")
cli_ts=$(jq -r '.cachedUsageUtilization.fetchedAtMs // 0 | . / 1000 | floor' "$HOME/.claude.json" 2>/dev/null)
cli_ts=${cli_ts:-0}
if (( cli_ts >= cache_ts )); then
  usage_json=$(jq -c '.cachedUsageUtilization.utilization // empty' "$HOME/.claude.json" 2>/dev/null)
  best_ts=$cli_ts
else
  usage_json=$(cat "$USAGE_CACHE" 2>/dev/null)
  best_ts=$cache_ts
fi

if (( now_s - best_ts > 1800 )) && (( $(file_age "$USAGE_STAMP") > 600 )); then
  touch "$USAGE_STAMP"
  (
    tok=$(jq -r '.claudeAiOauth.accessToken // empty' "$HOME/.claude/.credentials.json" 2>/dev/null)
    # macOS keeps the token in the Keychain, not in .credentials.json. Reading it
    # from here can raise a Keychain dialog once, because the ACL is per binary.
    # Set CLAUDE_STATUSLINE_NO_KEYCHAIN=1 to skip the lookup and the dialog.
    if [[ -z "$tok" && -z "$CLAUDE_STATUSLINE_NO_KEYCHAIN" ]]; then
      tok=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null \
        | jq -r '.claudeAiOauth.accessToken // empty' 2>/dev/null)
    fi
    [[ -n "$tok" ]] || exit 0
    resp=$(curl -sS --max-time 5 https://api.anthropic.com/api/oauth/usage \
      -H "Authorization: Bearer $tok" -H "anthropic-beta: oauth-2025-04-20" \
      -H "Content-Type: application/json" \
      -H "User-Agent: claude-cli/$version (external, cli)" 2>/dev/null)
    if jq -e 'has("limits") or has("five_hour")' <<<"$resp" >/dev/null 2>&1; then
      printf '%s' "$resp" > "$USAGE_CACHE.tmp" && mv "$USAGE_CACHE.tmp" "$USAGE_CACHE"
    fi
  ) >/dev/null 2>&1 &
fi

# The Fable weekly window is a "weekly_scoped" entry in the usage payload's
# .limits array: {kind, scope.model.display_name, percent (0-100), resets_at}.
fable_pct=-1 fable_reset=0
if [[ -n "$usage_json" ]]; then
  IFS=$'\t' read -r fable_pct fable_reset_raw <<<"$(jq -r '
    (.limits // [] | map(select(.kind == "weekly_scoped"
      and ((.scope.model.display_name // "") | ascii_downcase | contains("fable"))))
      | first) as $f |
    [($f.percent // -1 | round), ($f.resets_at // 0)] | @tsv' <<<"$usage_json" 2>/dev/null)"
  fable_pct=${fable_pct:--1}
  if [[ "$fable_reset_raw" =~ ^[0-9]+$ ]]; then
    fable_reset=$fable_reset_raw
  elif [[ -n "$fable_reset_raw" ]]; then
    # BSD date (macOS) has no -d. Its -f parser also chokes on the fractional
    # seconds and the offset, so feed it the first 19 chars. resets_at is UTC,
    # and -u makes BSD date read those 19 chars as UTC too.
    fable_reset=$(date -d "$fable_reset_raw" +%s 2>/dev/null \
      || date -j -u -f '%Y-%m-%dT%H:%M:%S' "${fable_reset_raw:0:19}" +%s 2>/dev/null \
      || echo 0)
  fi
fi

RESET='\033[0m'
DIM='\033[38;2;138;138;138m'
SEP='\033[38;2;55;55;55m'
TRACK='48;2;55;55;55'

# limit color (5h/7d/Fable): green < 50, yellow 50-80, red > 80 (truecolor RGB)
pct_color() {
  if   (( $1 > 80 )); then echo '38;2;220;60;60'
  elif (( $1 >= 50 )); then echo '38;2;220;200;60'
  else                     echo '38;2;140;194;74'
  fi
}

# context color: green < 25, yellow 25-49, red >= 50 (tighter — context fills fast)
ctx_color() {
  if   (( $1 >= 50 )); then echo '38;2;220;60;60'
  elif (( $1 >= 25 )); then echo '38;2;220;200;60'
  else                     echo '38;2;140;194;74'
  fi
}

# bar <pct> <width> [color_fn] — solid fill with 1/8-block resolution on a dark track
bar() {
  local pct=$1 w=$2 color_fn=${3:-pct_color} fg partials=("" "▏" "▎" "▍" "▌" "▋" "▊" "▉")
  (( pct < 0 )) && pct=0; (( pct > 100 )) && pct=100
  fg=$($color_fn "$pct")
  local eighths=$(( pct * w * 8 / 100 ))
  local full=$(( eighths / 8 )) part=$(( eighths % 8 ))
  local out="" i
  for (( i = 0; i < full; i++ )); do out+="█"; done
  out+="${partials[$part]}"
  local used=$(( full + (part > 0 ? 1 : 0) ))
  printf '\033[%s;%sm%s%*s\033[0m' "$TRACK" "$fg" "$out" $(( w - used )) ""
}

# stacked_bar <usage_pct> <elapsed_pct> <width> — usage (top, green/yellow/red)
# over window-time-elapsed (bottom, blue) in the same cells: each cell is ▀ with
# fg = top half, bg = bottom half. Usage sticking out past blue = burning too fast.
stacked_bar() {
  local u=$1 t=$2 w=$3
  (( u < 0 )) && u=0; (( u > 100 )) && u=100
  (( t < 0 )) && t=0; (( t > 100 )) && t=100
  local ufg=$(pct_color "$u") bluebg='48;2;40;80;130' trackfg='38;2;55;55;55'
  local ucells=$(( (u * w + 50) / 100 )) tcells=$(( (t * w + 50) / 100 ))
  (( u > 0 && ucells == 0 )) && ucells=1
  (( t > 0 && tcells == 0 )) && tcells=1
  local i fg bg out=""
  for (( i = 0; i < w; i++ )); do
    (( i < ucells )) && fg=$ufg || fg=$trackfg
    (( i < tcells )) && bg=$bluebg || bg=$TRACK
    out+="\033[${fg};${bg}m▀"
  done
  printf '%b\033[0m' "$out"
}

# fmt_tokens <count> — context tokens, always in thousands: 1k … 999k. A live
# session is never really at 0k, so anything under 500 rounds up to 1k instead
# of down to a 0k that reads like "nothing loaded".
fmt_tokens() {
  local k=$(( ($1 + 500) / 1000 ))
  (( k < 1 )) && k=1
  (( k > 999 )) && k=999
  echo "${k}k"
}

# fmt_reset <epoch> — time until reset: now / 45m / 7h9m / 3d10h
fmt_reset() {
  local diff=$(( $1 - $(date +%s) ))
  if   (( diff <= 60 ));    then echo "now"
  elif (( diff < 3600 ));   then echo "$(( diff / 60 ))m"
  elif (( diff < 86400 ));  then echo "$(( diff / 3600 ))h$(( diff % 3600 / 60 ))m"
  else echo "$(( diff / 86400 ))d$(( diff % 86400 / 3600 ))h"
  fi
}

segs=()

# directory + git branch
if [[ -n "$dir" ]]; then
  loc="\033[38;5;74m$(basename "$dir")"
  branch=$(git -C "$dir" branch --show-current 2>/dev/null)
  [[ -n "$branch" ]] && loc+=" ${DIM}⎇ ${branch}"
  segs+=("${loc}${RESET}")
fi

segs+=("\033[38;2;140;194;74m★ ${model}${RESET}")

if (( ctx_pct >= 0 )); then
  seg="${DIM}Ctx${RESET} $(bar "$ctx_pct" 10 ctx_color)"
  seg+=" \033[$(ctx_color "$ctx_pct")m${ctx_pct}%${RESET}"
  (( ctx_tokens > 0 )) && seg+=" ${DIM}$(fmt_tokens "$ctx_tokens")${RESET}"
  segs+=("$seg")
fi

# elapsed_pct <resets_at_epoch> <window_seconds> — how far into the window we are
elapsed_pct() {
  local remaining=$(( $1 - $(date +%s) ))
  echo $(( ( $2 - remaining ) * 100 / $2 ))
}

if (( five_pct >= 0 )); then
  seg="${DIM}5h${RESET} "
  if (( five_reset > 0 )); then
    seg+="$(stacked_bar "$five_pct" "$(elapsed_pct "$five_reset" 18000)" 10)"
  else
    seg+="$(bar "$five_pct" 10)"
  fi
  seg+=" \033[$(pct_color "$five_pct")m${five_pct}%${RESET}"
  (( five_reset > 0 )) && seg+=" ${DIM}↻$(fmt_reset "$five_reset")${RESET}"
  segs+=("$seg")
fi

if (( week_pct >= 0 )); then
  seg="${DIM}7d${RESET} "
  if (( week_reset > 0 )); then
    seg+="$(stacked_bar "$week_pct" "$(elapsed_pct "$week_reset" 604800)" 10)"
  else
    seg+="$(bar "$week_pct" 10)"
  fi
  seg+=" \033[$(pct_color "$week_pct")m${week_pct}%${RESET}"
  (( week_reset > 0 )) && seg+=" ${DIM}↻$(fmt_reset "$week_reset")${RESET}"
  segs+=("$seg")
fi

if (( fable_pct >= 0 )); then
  seg="${DIM}Fable${RESET} "
  if (( fable_reset > 0 )); then
    seg+="$(stacked_bar "$fable_pct" "$(elapsed_pct "$fable_reset" 604800)" 10)"
  else
    seg+="$(bar "$fable_pct" 10)"
  fi
  # No ↻ countdown here: the Fable window resets with the 7-day one, so the
  # segment before it already shows this exact time.
  seg+=" \033[$(pct_color "$fable_pct")m${fable_pct}%${RESET}"
  segs+=("$seg")
fi

out=""
for s in "${segs[@]}"; do
  [[ -n "$out" ]] && out+=" ${SEP}│${RESET} "
  out+="$s"
done
printf '%b\n' "$out"
