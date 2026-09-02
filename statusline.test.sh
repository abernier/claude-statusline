#!/usr/bin/env bash
# Golden-file tests for statusline.sh.
#
#   ./statusline.test.sh              run every fixture
#   ./statusline.test.sh basic        run the fixtures whose name contains "basic"
#   ./statusline.test.sh --update     rewrite every expected.txt from what the
#                                     script prints now (read the diff before
#                                     committing it)
#
# A statusline is a rendering, so the only thing worth asserting is the exact
# bytes it writes, escape sequences included. Each fixture in statusline.test/
# is a directory holding an input and the output it must produce, and a run is
# a byte compare.
#
# The script reads three things from the machine — the clock, git, and $HOME —
# and each one would make two runs differ. All three are replaced here, so a
# fixture is the whole world the script sees:
#
#   statusline.test/bin/date      `date +%s` returns a frozen epoch, so a
#                                 countdown recorded today still reads "↻2h0m"
#                                 next year. Every other date call is real.
#   statusline.test/bin/git       the four questions statusline.sh asks git are
#                                 answered from files in the fixture — a working
#                                 tree is described, never created.
#   statusline.test/bin/curl      the background usage refresh can neither reach
#   statusline.test/bin/security  the network nor raise a Keychain prompt.
#   $HOME                         a fresh temp dir per fixture, seeded from the
#                                 fixture's own home/ when it has one. An empty
#                                 $HOME also means no settings file is read, so
#                                 every fixture renders the defaults unless it
#                                 ships one.
#
# Fixture layout — a directory is a fixture when it holds a stdin.json, and
# everything else in it is optional:
#
#   stdin.json    the statusline JSON fed to the script
#   env           KEY=VALUE lines exported for the run (COLUMNS, overrides…)
#   git/branch    stdout for `git branch --show-current`
#   git/status    stdout for `git status --porcelain`
#   git/numstat   stdout for `git diff HEAD --numstat`
#   git/worktree  presence marks the checkout as a linked worktree (⎇+)
#   home/         copied into $HOME (e.g. home/.claude.json for the Fable data)
#   expected.txt  the bytes the script must write
#
# subagent-statusline.test.sh is the same idea for the agent panel, minus all
# of the stubbing — that script reads nothing but its stdin.

set -uo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
suite=$here/statusline.test
script=$here/statusline.sh

# 2026-01-01T00:00:00Z. Every resets_at in a fixture is an offset from this, so
# the countdowns and the elapsed-time halves of the bars are the same on every
# machine, forever.
FROZEN_NOW=1767225600

update=0
filter=""
for arg in "$@"; do
  case $arg in
    --update) update=1 ;;
    *)        filter=$arg ;;
  esac
done

# One temp root for the whole run, removed on the way out however the run ends
# — an interrupted suite used to leave a directory behind per fixture.
tmproot=$(mktemp -d)
trap 'rm -rf "$tmproot"' EXIT

# The width helpers need two things from the shell they run in, and a name
# holding a wide character measures — and so elides, and so pads — differently
# without either. Both are probed against the `bash` on PATH, which is the one
# that will run statusline.sh:
#
#   counting     under a non-UTF-8 locale bash counts bytes, not characters
#   decoding     `printf '%d' "'X"` has to yield X's codepoint, because that is
#                what wide() compares against its ranges. bash 3.2 — still the
#                /bin/bash macOS ships — yields the first *byte* instead, so
#                every CJK name comes out measured at half its true width.
#
# Rather than record that second rendering as if it were correct, the suite
# says which of the two is missing and stops.
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
  echo "statusline.test.sh: this bash cannot measure wide characters." >&2
  bash --version | head -1 >&2
  echo "Either no UTF-8 locale is installed (tried C.UTF-8, en_US.UTF-8), or" >&2
  echo "bash is 3.2, whose printf '%d' \"'X\" returns a byte and not a codepoint." >&2
  echo "Put a bash 4 or newer first on PATH and run again." >&2
  exit 2
fi
# The failure report pipes the goldens through sed and diff, which choke on
# UTF-8 bytes under a C locale.
export LC_ALL=$locale_utf8

command -v jq >/dev/null || { echo "statusline.test.sh: jq is required" >&2; exit 2; }

pass=0 fail=0 updated=0
failures=()

for dir in "$suite"/*/; do
  name=$(basename "$dir")
  [[ -f $dir/stdin.json ]] || continue          # bin/ and anything else: not a fixture
  [[ -n $filter && $name != *"$filter"* ]] && continue

  tmp=$tmproot/$name
  mkdir -p "$tmp"
  home=$tmp/home
  # .claude/cache is what a real install has, and the background usage refresh
  # writes its attempt stamp straight into it — without the directory, `touch`
  # fails and the script writes to stderr on every render.
  mkdir -p "$home/.claude/cache"
  [[ -d $dir/home ]] && cp -R "$dir/home/." "$home/"

  # The worktree glyph turns on a `commondir` file sitting next to the git dir,
  # so the stub points at a directory whose shape the fixture decides.
  gitdir=$tmp/gitdir
  mkdir -p "$gitdir"
  [[ -e $dir/git/worktree ]] && : > "$gitdir/commondir"

  # The fixture's own env comes last, so a fixture can override any of these.
  # COLUMNS and STATUSLINE_LOC_MAX start empty rather than unset: statusline.sh
  # tests both against ^[0-9]+$, so empty reads as absent, and passing them by
  # value keeps whatever the developer's shell exports out of the run. (`env -u`
  # would be the obvious way to do that, but BSD env applies it after the
  # assignments on the same line, which would silently drop a fixture's own.)
  envs=(
    "COLUMNS="
    "STATUSLINE_LOC_MAX="
    "PATH=$suite/bin:$PATH"
    "HOME=$home"
    "LC_ALL=$locale_utf8"
    "STATUSLINE_TEST_PATH=$PATH"
    "STATUSLINE_TEST_NOW=$FROZEN_NOW"
    "STATUSLINE_TEST_GIT=$dir/git"
    "STATUSLINE_TEST_GITDIR=$gitdir"
    "STATUSLINE_TEST_GIT_LOG=$tmp/unhandled-git.log"
    "CLAUDE_STATUSLINE_NO_KEYCHAIN=1"
  )
  if [[ -f $dir/env ]]; then
    # `|| [[ -n $line ]]` so an env file with no trailing newline does not
    # silently lose its last line — which would pass, against a golden recorded
    # without that setting.
    while IFS= read -r line || [[ -n $line ]]; do
      [[ -z $line || $line == '#'* ]] && continue
      envs+=("$line")
    done < "$dir/env"
  fi

  # Written to a file rather than captured in $(): command substitution eats
  # trailing newlines, and whether the last row ends in one is part of the
  # rendering.
  env "${envs[@]}" \
    bash "$script" < "$dir/stdin.json" > "$tmp/actual.txt" 2> "$tmp/stderr.txt"
  status=$?

  verdict=""
  if (( status != 0 )); then
    verdict="exited $status"
  elif [[ -s $tmp/unhandled-git.log ]]; then
    # A git call no fixture can answer. The script swallows the stub's stderr
    # and its exit code, so the log is the only place this shows up.
    verdict="asked git something no fixture answers:"$'\n'"$(sed 's/^/    /' "$tmp/unhandled-git.log")"
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
    failures+=("$name: no expected.txt (run ./statusline.test.sh --update)")
    printf '  FAIL     %s\n' "$name"
    fail=$((fail + 1))
  else
    # cat -v, so the escape sequences show up as text: a diff of raw escapes
    # prints two lines that look identical.
    failures+=("$name:"$'\n'"$(diff -u --label expected --label actual \
      <(cat -v "$dir/expected.txt") <(cat -v "$tmp/actual.txt") | sed 's/^/    /')")
    printf '  FAIL     %s\n' "$name"
    fail=$((fail + 1))
  fi
done

# A suite that ran nothing must not report success — a renamed directory, a
# typo in a filter, or a checkout missing statusline.test/ would otherwise go
# green in CI with no fixture executed.
if (( pass + fail + updated == 0 )); then
  if [[ -n $filter ]]; then
    echo "statusline.test.sh: no fixture matches '$filter'" >&2
  else
    echo "statusline.test.sh: no fixtures found in $suite" >&2
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
