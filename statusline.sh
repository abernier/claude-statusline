#!/usr/bin/env bash
# Claude Code statusline: dir ⎇branch │ ★ Model · effort │ Ctx ▓▓░ 9% 90k │ 5h ▓░░ 4% ↻2h │ 7d ▓▓░ 16% ↻3d10h
# Reads the statusline JSON from stdin (see https://code.claude.com/docs/en/statusline.md)

input=$(cat)

# Tab is an IFS whitespace character, so bash collapses a run of tabs: one
# empty field would shift every value after it. `d` keeps the text fields
# non-empty. A path cannot hold U+001F, so it stands in for "no directory"
# and is cleared right after the read.
IFS=$'\t' read -r model effort dir version ctx_pct ctx_tokens five_pct five_reset week_pct week_reset <<<"$(jq -r '
def d($fallback): if (. // "") == "" then $fallback else . end;
[
  (.model.display_name | d("?")),
  ((.effort | objects | .level) // "" | d("\u001f")),
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
[[ $effort == $'\x1f' ]] && effort=""   # absent for models without an effort setting

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
AMBER='\033[38;2;255;175;60m'
TRACK='48;2;55;55;55'

# limit color (5h/7d/Fable): green < 50, yellow 50-80, red > 80 (truecolor RGB)
pct_color() {
  if   (( $1 > 80 )); then echo '38;2;220;60;60'
  elif (( $1 >= 50 )); then echo '38;2;220;200;60'
  else                     echo '38;2;140;194;74'
  fi
}

# pace color (stacked bar top row): usage vs window-time-elapsed. Green when
# usage trails the blue row, yellow within ±5 points (half a cell), red when it
# leads — leading pace hits 100% before the window resets.
pace_color() {
  local diff=$(( $1 - $2 ))
  if   (( diff > 5 ));   then echo '38;2;220;60;60'
  elif (( diff >= -5 )); then echo '38;2;220;200;60'
  else                        echo '38;2;140;194;74'
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

# stacked_bar <usage_pct> <elapsed_pct> <width> — usage (top, pace-colored)
# over window-time-elapsed (bottom, blue) in the same cells: each cell is ▀ with
# fg = top half, bg = bottom half. Usage sticking out past blue = burning too fast.
stacked_bar() {
  local u=$1 t=$2 w=$3
  (( u < 0 )) && u=0; (( u > 100 )) && u=100
  (( t < 0 )) && t=0; (( t > 100 )) && t=100
  local ufg=$(pace_color "$u" "$t") bluebg='48;2;40;80;130' trackfg='38;2;55;55;55'
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

# --- display width. A terminal counts columns; bash counts characters. CJK
# and emoji take two columns, and under a non-UTF-8 locale bash counts bytes,
# where cutting a string mid-sequence would write invalid UTF-8 to the
# terminal. `UTF8` records whether this shell sees characters at all. ASCII,
# which is almost every name, skips the whole thing.
utf8_probe='ää'
[[ ${#utf8_probe} == 2 ]] && UTF8=1 || UTF8=''

is_ascii() { [[ $1 != *[^\ -~]* ]]; }

# wide <codepoint> — the ranges a terminal draws two columns wide
wide() {
  local c=$1
  (( c >= 0x1100 )) || return 1
  (( c <= 0x115f || c == 0x2329 || c == 0x232a \
     || ( c >= 0x2e80 && c <= 0xa4cf && c != 0x303f ) \
     || ( c >= 0xac00 && c <= 0xd7a3 ) || ( c >= 0xf900 && c <= 0xfaff ) \
     || ( c >= 0xfe30 && c <= 0xfe6f ) || ( c >= 0xff00 && c <= 0xff60 ) \
     || ( c >= 0xffe0 && c <= 0xffe6 ) || ( c >= 0x1f300 && c <= 0x1faff ) \
     || ( c >= 0x20000 && c <= 0x3fffd ) ))
}

# vis_len <string> — how many columns the string occupies
vis_len() {
  local s=$1 n=0 i cp
  if is_ascii "$s" || [[ -z $UTF8 ]]; then echo "${#s}"; return; fi
  for (( i = 0; i < ${#s}; i++ )); do
    printf -v cp '%d' "'${s:i:1}"
    if wide "$cp"; then n=$(( n + 2 )); else n=$(( n + 1 )); fi
  done
  echo "$n"
}

# vis_cut <string> <columns> — the longest prefix that fits in that many
# columns. A shell that cannot see characters leaves a multibyte string whole
# rather than splitting a sequence in half.
vis_cut() {
  local s=$1 max=$2
  is_ascii "$s" && { echo "${s:0:max}"; return; }
  [[ -z $UTF8 ]] && { echo "$s"; return; }
  local n=0 i cp w out=''
  for (( i = 0; i < ${#s}; i++ )); do
    printf -v cp '%d' "'${s:i:1}"
    w=1; wide "$cp" && w=2
    (( n + w > max )) && break
    out+=${s:i:1}; n=$(( n + w ))
  done
  echo "$out"
}

# short_model <display_name> — "Claude Opus 4.8" -> "Opus 4.8",
# "Opus 5 (1M context)" -> "Opus 5 1M". The CLI builds the long form by
# appending " (1M context)" to a registry display_name whenever the model id
# carries the [1m] suffix, so undoing exactly that is safe.
short_model() {
  local m=${1#Claude }
  # printf, not echo: a display name of "-e" or "-n" would be eaten as a flag
  printf '%s' "${m/ (1M context)/ 1M}"
}

# effort_label <level> — the five levels the CLI sends, short enough to sit
# next to the model name
effort_label() {
  case $1 in
    low)    echo "low"  ;;
    medium) echo "med"  ;;
    high)   echo "high" ;;
    xhigh)  echo "xhi"  ;;
    max)    echo "max"  ;;
    *)      echo ""     ;;
  esac
}

# word_trim <string> <max> — shorten to <max> columns, cutting at the word
# boundary nearest the limit. A boundary further back than 3 columns throws
# away more than it saves, so that falls through to a hard cut.
word_trim() {
  local s=$1 n=$2
  (( $(vis_len "$s") <= n )) && { printf '%s' "$s"; return; }
  local cut best="" i
  cut=$(vis_cut "$s" $(( n - 1 )))            # the … takes the last column
  [[ $cut == "$s" ]] && { printf '%s' "$s"; return; }   # nothing safe to cut
  for (( i = ${#cut}; i >= 4; i-- )); do
    [[ ${cut:i:1} == [-_./] ]] && { best=${cut:0:i}; break; }
  done
  (( ${#best} < ${#cut} - 3 )) && best=$cut
  printf '%s' "${best}…"
}

# The project and the branch share one column budget. Nothing is shortened
# while both fit; past that the branch gives up its namespace, then its tail,
# and only then does the project give up anything.
# Anything but digits here would be evaluated as an arithmetic expression, so
# it is checked before it ever reaches (( )).
LOC_MAX=${STATUSLINE_LOC_MAX:-34}
[[ $LOC_MAX =~ ^[0-9]+$ ]] || LOC_MAX=34
LOC_GLUE=3          # the " ⎇ " between the two
BRANCH_FLOOR=12     # the shortest branch worth printing
PROJECT_FLOOR=10    # the shortest project worth printing

segs=()

# directory + git branch. A linked worktree's private git dir holds a
# `commondir` file and the main .git never does — a path-string comparison of
# --git-dir and --git-common-dir cannot tell them apart, because git returns
# one absolute and one relative from a subdirectory. In a worktree the glyph
# becomes an amber ⎇+ instead of ⎇.
if [[ -n "$dir" ]]; then
  project=$(basename "$dir")
  branch=$(git -C "$dir" branch --show-current 2>/dev/null)

  # ⎇+ is one column wider than ⎇, and with no branch there is no glyph at
  # all, so the project gets the whole budget
  worktree=""
  if [[ -n "$branch" ]]; then
    gd=$(git -C "$dir" rev-parse --absolute-git-dir 2>/dev/null)
    [[ -n "$gd" && -f "$gd/commondir" ]] && worktree=1
  fi
  glue=0
  if [[ -n "$branch" ]]; then
    glue=$LOC_GLUE
    [[ -n "$worktree" ]] && glue=$(( LOC_GLUE + 1 ))
  fi

  # spend the budget one step at a time, stopping as soon as the pair fits
  pw=$(vis_len "$project") bw=$(vis_len "$branch")
  if (( pw + bw + glue > LOC_MAX )); then
    if [[ $branch == */* ]]; then
      branch="${branch:0:1}/${branch##*/}"          # feature/x -> f/x
      bw=$(vis_len "$branch")
    fi
    room=$(( LOC_MAX - pw - glue ))
    if (( room >= bw || room >= BRANCH_FLOOR )); then
      branch=$(word_trim "$branch" "$room")
    else
      # neither fits: the branch takes its floor, or its own width if that is
      # less, and the project takes the rest
      (( bw > BRANCH_FLOOR )) && bw=$BRANCH_FLOOR
      room=$(( LOC_MAX - glue - bw ))
      (( room < PROJECT_FLOOR )) && room=$PROJECT_FLOOR
      project=$(word_trim "$project" "$room")
      branch=$(word_trim "$branch" "$bw")
    fi
  fi

  loc="\033[38;5;74m${project}"
  if [[ -n "$branch" ]]; then
    if [[ -n "$worktree" ]]; then
      loc+=" ${AMBER}⎇+ ${DIM}${branch}"
    else
      loc+=" ${DIM}⎇ ${branch}"
    fi
  fi
  segs+=("${loc}${RESET}")
fi

seg="\033[38;2;140;194;74m★ $(short_model "$model")${RESET}"
eff=$(effort_label "$effort")
[[ -n "$eff" ]] && seg+=" ${SEP}·${RESET} ${DIM}${eff}${RESET}"
segs+=("$seg")

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
