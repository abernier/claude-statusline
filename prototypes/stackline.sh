#!/usr/bin/env bash
# Prototype: a PR-stack segment for the statusline.
# Usage: stackline.sh [-R owner/repo] [-b branch] [-v A|B|C|D|E|all]
set -uo pipefail

CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/claude-statusline"; mkdir -p "$CACHE_DIR"
REPO="" BRANCH="" VARIANT=all
while getopts ":R:b:v:" o; do case $o in R) REPO=$OPTARG;; b) BRANCH=$OPTARG;; v) VARIANT=$OPTARG;; esac; done

RESET=$'\033[0m'; DIM=$'\033[38;2;138;138;138m'; SEP=$'\033[38;2;55;55;55m'
BOLD=$'\033[1m'; AMBER=$'\033[38;2;255;175;60m'; GREEN=$'\033[38;2;140;194;74m'
RED=$'\033[38;2;220;60;60m'; BLUE=$'\033[38;2;74;144;226m'

[[ -n $REPO ]] || REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
[[ -n $REPO ]] || { echo "not a github repo"; exit 0; }
[[ -n $BRANCH ]] || BRANCH=$(git branch --show-current 2>/dev/null)

key=${REPO//\//_}
PRS="$CACHE_DIR/$key.prs.json"; TRUNK_F="$CACHE_DIR/$key.trunk"

age() { [[ -f $1 ]] && echo $(( $(date +%s) - $(stat -c %Y "$1" 2>/dev/null || stat -f %m "$1") )) || echo 999999; }

# trunk is discovered, never assumed: cli/cli calls it `trunk`, not `main`
if [[ $(age "$TRUNK_F") -gt 86400 ]]; then
  gh repo view "$REPO" --json defaultBranchRef -q .defaultBranchRef.name > "$TRUNK_F.tmp" 2>/dev/null \
    && mv "$TRUNK_F.tmp" "$TRUNK_F"
fi
TRUNK=$(cat "$TRUNK_F" 2>/dev/null); TRUNK=${TRUNK:-main}

# PR list: served from cache, refreshed in the background — never on the render path
if [[ $(age "$PRS") -gt 120 ]]; then
  ( gh pr list --repo "$REPO" --state open --limit 200 \
      --json number,headRefName,baseRefName,isDraft,reviewDecision > "$PRS.tmp" 2>/dev/null \
      && mv "$PRS.tmp" "$PRS" ) >/dev/null 2>&1 &
fi
[[ -s $PRS ]] || { wait; }
[[ -s $PRS ]] || { echo "no pr cache yet"; exit 0; }

chain=$(jq -r --arg tip "$BRANCH" --arg trunk "$TRUNK" '
  def pr($h): (map(select(.headRefName == $h)) | first);
  def st($p): if $p == null then "none" elif $p.isDraft then "draft"
              elif $p.reviewDecision == "APPROVED" then "approved" else "review" end;
  def down($h; $acc):
    if $h == $trunk or ($acc|length) > 20 then $acc
    else pr($h) as $p
    | if $p == null then $acc else down($p.baseRefName; $acc + [{name:$h, state:st($p)}]) end end;
  def up($h; $acc):
    (map(select(.baseRefName == $h))) as $k
    | if ($k|length) == 0 or ($acc|length) > 20 then $acc
      else ($k[0]) as $c | up($c.headRefName; $acc + [{name:$c.headRefName, state:st($c)}]) end;
  ([{name:$trunk, state:"trunk"}] + (down($tip; []) | reverse) + up($tip; []))
  | .[] | "\(.name)\t\(.state)"' "$PRS")

names=(); states=()
while IFS=$'\t' read -r n s; do [[ -n $n ]] || continue; names+=("$n"); states+=("$s"); done <<<"$chain"
n=${#names[@]}
cur=-1; for ((i=0;i<n;i++)); do [[ ${names[i]} == "$BRANCH" ]] && cur=$i; done
(( n > 1 && cur >= 0 )) || { printf 'no stack: %s is not in a PR chain on %s\n' "$BRANCH" "$REPO"; exit 0; }

# a stack shares a prefix; the tail is what distinguishes the branches
pfx="${names[1]}"
for ((i=2;i<n;i++)); do
  while [[ -n $pfx && ${names[i]} != "$pfx"* ]]; do pfx="${pfx%?}"; done
done
pfx="${pfx%%[a-zA-Z0-9]}"   # keep the last word whole
short=(); for ((i=0;i<n;i++)); do
  if (( i == 0 )); then short+=("${names[i]}"); else short+=("${names[i]#$pfx}"); fi
done

cof() { case $1 in approved) printf '%s' "$GREEN";; review) printf '%s' "$AMBER";;
                   draft) printf '%s' "$DIM";; trunk) printf '%s' "$BLUE";;
                   restack) printf '%s' "$RED";; *) printf '%s' "$DIM";; esac; }

beads=""; bar=""
for ((i=0;i<n;i++)); do
  c=$(cof "${states[i]}")
  if (( i == cur )); then beads+="${BOLD}${c}◆${RESET}"; bar+="${BOLD}${c}█${RESET}"
  elif [[ ${states[i]} == trunk ]]; then beads+="${c}▪${RESET}"; bar+="${c}▄${RESET}"
  else beads+="${c}●${RESET}"; bar+="${c}▄${RESET}"; fi
done

show() { case $VARIANT in all|$1) return 0;; *) return 1;; esac; }
show A && printf 'A  %s⎇ %s%s  %s  %s%d/%d%s\n' "$DIM" "${short[cur]}" "$RESET" "$beads" "$DIM" "$cur" "$((n-1))" "$RESET"
show B && printf 'B  %s⎇ %s%s  %s  %s%d/%d%s\n' "$DIM" "${short[cur]}" "$RESET" "$bar"   "$DIM" "$cur" "$((n-1))" "$RESET"
show C && printf 'C  %s⎇ %s%s  %s⧉%d/%d%s\n'    "$DIM" "${short[cur]}" "$RESET" "$AMBER" "$cur" "$((n-1))" "$RESET"
if show D; then
  below="-"; above="-"; (( cur > 0 )) && below="${short[cur-1]}"; (( cur < n-1 )) && above="${short[cur+1]}"
  printf 'D  %s%s %s↑%s %s%s%s %s↑ %s%s%s\n' "$DIM" "$below" "$SEP" "$RESET" "$BOLD$AMBER" "${short[cur]}" "$RESET" "$SEP" "$DIM" "$above" "$RESET"
fi
if show E; then
  e=""; for ((i=0;i<n;i++)); do (( i > 0 )) && e+="${SEP}→${RESET}"
    if (( i == cur )); then e+="${BOLD}${AMBER}${short[i]}${RESET}"; else e+="$(cof "${states[i]}")${short[i]}${RESET}"; fi; done
  printf 'E  %s\n' "$e"
fi
