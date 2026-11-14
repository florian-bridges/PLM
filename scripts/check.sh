#!/usr/bin/env bash
# The gate for every change: typecheck, tests, extension build, word limits, traces.
# Prints one line per step; a failing step adds the last lines of its output. Exit 1 if any fails.
cd "$(dirname "$0")/.." || exit 1
fail=0
step() {
  local name=$1; shift
  local out
  if out=$("$@" 2>&1); then
    echo "ok   $name"
  else
    echo "FAIL $name"; echo "$out" | grep -v '^\s*$' | tail -n 25 | sed 's/^/     /'; fail=1
  fi
}
step typecheck npm run -s typecheck
step test      npm test --silent -- --reporter=dot
step build:ext npm run -s build:ext
step words     python3 scripts/wordcount.py -u
step trace     python3 scripts/trace.py
python3 scripts/trace.py | grep '^warning' | sed 's/^/     /'
exit $fail
