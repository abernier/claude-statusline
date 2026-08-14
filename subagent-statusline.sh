#!/usr/bin/env bash
# Claude Code subagent statusline: one row per agent in the agent panel, each
# with its own context bar:  name ▓▓░░░ 12% 34k · description
# Reads {columns, tasks:[...]} JSON on stdin, writes one {"id","content"} JSON
# line per task (see https://code.claude.com/docs/en/statusline.md).
# Palette, thresholds and bar geometry mirror statusline.sh — change one,
# change the other.

input=$(cat)
columns=$(jq -r '.columns // 80' <<<"$input")

RESET=$'\033[0m'
DIM=$'\033[38;2;138;138;138m'
SEP=$'\033[38;2;55;55;55m'
NAME=$'\033[38;5;74m'
TRACK='48;2;55;55;55'

# context color: green < 25, yellow 25-49, red >= 50 (same as statusline.sh)
ctx_color() {
  if   (( $1 >= 50 )); then echo '38;2;220;60;60'
  elif (( $1 >= 25 )); then echo '38;2;220;200;60'
  else                     echo '38;2;140;194;74'
  fi
}

# bar <pct> <width> — solid fill with 1/8-block resolution on a dark track
bar() {
  local pct=$1 w=$2 fg partials=("" "▏" "▎" "▍" "▌" "▋" "▊" "▉")
  (( pct < 0 )) && pct=0; (( pct > 100 )) && pct=100
  fg=$(ctx_color "$pct")
  local eighths=$(( pct * w * 8 / 100 ))
  local full=$(( eighths / 8 )) part=$(( eighths % 8 ))
  local out="" i
  for (( i = 0; i < full; i++ )); do out+="█"; done
  out+="${partials[$part]}"
  local used=$(( full + (part > 0 ? 1 : 0) ))
  printf '\033[%s;%sm%s%*s\033[0m' "$TRACK" "$fg" "$out" $(( w - used )) ""
}

# fmt_tokens <count> — always in thousands: 1k … 999k (same as statusline.sh)
fmt_tokens() {
  local k=$(( ($1 + 500) / 1000 ))
  (( k < 1 )) && k=1
  (( k > 999 )) && k=999
  echo "${k}k"
}

while IFS=$'\t' read -r id name status desc tokens cws; do
  [[ -n "$id" ]] || continue
  [[ $name == $'\x1f' ]] && name="agent"
  [[ $status == $'\x1f' ]] && status=""
  [[ $desc == $'\x1f' ]] && desc=""
  [[ "$tokens" =~ ^[0-9]+$ ]] || tokens=0
  [[ "$cws" =~ ^[0-9]+$ ]] || cws=0

  if (( cws > 0 )); then
    pct=$(( tokens * 100 / cws ))
    tok_str=$(fmt_tokens "$tokens")
    meter="$(bar "$pct" 10) "$'\033['"$(ctx_color "$pct")m${pct}%${RESET} ${DIM}${tok_str}${RESET}"
    # visible width: bar(10) + space + "NN%" + space + tokens
    meter_len=$(( 10 + 1 + ${#pct} + 1 + 1 + ${#tok_str} ))
  else
    # model not resolved yet: no window size, so no percentage — tokens only.
    # A task that has not started really is at 0, so no round-up to 1k here.
    (( tokens > 0 )) && tok_str=$(fmt_tokens "$tokens") || tok_str="0k"
    meter="${DIM}${tok_str}${RESET}"
    meter_len=${#tok_str}
  fi

  row="${NAME}${name}${RESET} ${meter}"
  row_len=$(( ${#name} + 1 + meter_len ))

  # description, truncated so the row fits the panel width
  room=$(( columns - row_len - 3 ))
  if [[ -n "$desc" ]] && (( room > 4 )); then
    (( ${#desc} > room )) && desc="${desc:0:room-1}…"
    row+=" ${SEP}·${RESET} ${DIM}${desc}${RESET}"
  fi

  jq -cn --arg id "$id" --arg content "$row" '{id:$id, content:$content}'
# Tab is an IFS whitespace character, so bash collapses a run of tabs and
# shifts every field after an empty one. d() keeps text fields non-empty with
# U+001F, cleared after the read (same trick as statusline.sh).
done < <(jq -r '.tasks[] |
  def d: if (. // "") == "" then "\u001f" else . end;
  [
    .id,
    ((.name // "agent") | d),
    ((.status // "") | d),
    ((.description // "") | d),
    (.tokenCount // 0),
    (.contextWindowSize // 0)
  ] | @tsv' <<<"$input")
