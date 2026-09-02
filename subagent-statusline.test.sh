#!/usr/bin/env bash
# Golden-file tests for subagent-statusline.sh.
#
#   ./subagent-statusline.test.sh              run every fixture
#   ./subagent-statusline.test.sh narrow       run the fixtures whose name matches
#   ./subagent-statusline.test.sh --update     rewrite every expected.txt
#
# Same shape as statusline.test.sh — a fixture is a directory in
# subagent-statusline.test/ holding the JSON to feed in and the bytes that must
# come out — but with none of the stubbing. The agent panel script reads its
# stdin and nothing else: no clock, no git, no $HOME. That is why the two
# runners are separate files rather than one with a flag.
#
# Fixture layout:
#
#   stdin.json    the {columns, tasks:[…]} payload the panel sends
#   env           KEY=VALUE lines exported for the run (rarely needed)
#   expected.txt  the JSON lines the script must write

set -uo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
suite=$here/subagent-statusline.test
script=$here/subagent-statusline.sh

update=0
filter=""
for arg in "$@"; do
  case $arg in
    --update) update=1 ;;
    *)        filter=$arg ;;
  esac
done

tmproot=$(mktemp -d)
trap 'rm -rf "$tmproot"' EXIT

# Names and descriptions are measured in columns, which takes a UTF-8 locale
# and a bash whose printf decodes a codepoint — see the long note in
# statusline.test.sh for what breaks without either.
pick_utf8_locale() {
  local l
  for l in C.UTF-8 en_US.UTF-8 C.utf8 en_US.utf8; do
    LC_ALL=$l bash -c '[[ ${#1} == 2 ]]' _ 'ää' 2>/dev/null || continue
    LC_ALL=$l bash -c 'printf -v c "%d" "'\''$1"; (( c > 1000 ))' _ '状' 2>/dev/null || continue
    printf '%s' "$l"
    return 0
  done
  return 1
}
if ! locale_utf8=$(pick_utf8_locale); then
  echo "subagent-statusline.test.sh: this bash cannot measure wide characters." >&2
  bash --version | head -1 >&2
  echo "A UTF-8 locale and bash 4 or newer are both needed." >&2
  exit 2
fi
export LC_ALL=$locale_utf8

command -v jq >/dev/null || { echo "subagent-statusline.test.sh: jq is required" >&2; exit 2; }

pass=0 fail=0 updated=0
failures=()

for dir in "$suite"/*/; do
  name=$(basename "$dir")
  [[ -f $dir/stdin.json ]] || continue
  [[ -n $filter && $name != *"$filter"* ]] && continue

  tmp=$tmproot/$name
  mkdir -p "$tmp"

  envs=("LC_ALL=$locale_utf8")
  if [[ -f $dir/env ]]; then
    # `|| [[ -n $line ]]`: an env file with no trailing newline would otherwise
    # lose its last line silently.
    while IFS= read -r line || [[ -n $line ]]; do
      [[ -z $line || $line == '#'* ]] && continue
      envs+=("$line")
    done < "$dir/env"
  fi

  env "${envs[@]}" bash "$script" < "$dir/stdin.json" \
    > "$tmp/actual.txt" 2> "$tmp/stderr.txt"
  status=$?

  verdict=""
  if (( status != 0 )); then
    verdict="exited $status"
  elif [[ -s $tmp/stderr.txt ]]; then
    verdict="wrote to stderr:"$'\n'"$(sed 's/^/    /' "$tmp/stderr.txt")"
  fi
  if [[ -n $verdict ]]; then
    failures+=("$name: $verdict")
    printf '  FAIL     %s\n' "$name"
    fail=$((fail + 1)); continue
  fi

  if [[ -f $dir/expected.txt ]] && cmp -s "$tmp/actual.txt" "$dir/expected.txt"; then
    printf '  ok       %s\n' "$name"
    pass=$((pass + 1))
  elif (( update )); then
    cp "$tmp/actual.txt" "$dir/expected.txt"
    printf '  updated  %s\n' "$name"
    updated=$((updated + 1))
  elif [[ ! -f $dir/expected.txt ]]; then
    failures+=("$name: no expected.txt (run ./subagent-statusline.test.sh --update)")
    printf '  FAIL     %s\n' "$name"
    fail=$((fail + 1))
  else
    failures+=("$name:"$'\n'"$(diff -u --label expected --label actual \
      <(cat -v "$dir/expected.txt") <(cat -v "$tmp/actual.txt") | sed 's/^/    /')")
    printf '  FAIL     %s\n' "$name"
    fail=$((fail + 1))
  fi
done

# A suite that ran nothing must not report success.
if (( pass + fail + updated == 0 )); then
  if [[ -n $filter ]]; then
    echo "subagent-statusline.test.sh: no fixture matches '$filter'" >&2
  else
    echo "subagent-statusline.test.sh: no fixtures found in $suite" >&2
  fi
  exit 2
fi

# `fail` rather than ${#failures[@]}: bash 3.2, which is the /bin/bash macOS
# still ships, treats an empty array as unset under `set -u`.
if (( fail )); then
  printf '\nlocale: %s, bash: %s\n\n' "$locale_utf8" "$(bash --version | head -1)"
  for f in "${failures[@]}"; do printf '%s\n\n' "$f"; done
fi

printf '%d passed, %d failed' "$pass" "$fail"
(( updated )) && printf ', %d updated' "$updated"
printf '\n'
(( fail == 0 ))
