#!/usr/bin/env bash
# Checks everything a run needs before it touches the app, and fixes what it safely can.
#
#   bash preflight.sh <suite-folder> <VARIABLE> <FALLBACK>
#
# Prints the address, installs Chromium for the test runner if it is missing, checks the suite's
# config loads, and says whether an earlier run left specs/coverage.md to resume from.
# Exits non-zero on anything it cannot fix.
set -uo pipefail

suite="${1:?usage: preflight.sh <suite-folder> <VARIABLE> <FALLBACK>}"
var="${2:?usage: preflight.sh <suite-folder> <VARIABLE> <FALLBACK>}"
fallback="${3:?usage: preflight.sh <suite-folder> <VARIABLE> <FALLBACK>}"
here="$(cd "$(dirname "$0")" && pwd)"
fail=0

echo "ok    address: $(bash "$here/base-url.sh" "$var" "$fallback")"

[ -f "$suite/playwright.config.ts" ] || { echo "FAIL  no $suite/playwright.config.ts"; exit 1; }

# The test runner's own browser (the MCP server has its own; see the discovery phase).
if ! chromium="$(node -e "console.log(require('@playwright/test').chromium.executablePath())" 2>/dev/null)"; then
  echo "FAIL  @playwright/test is not installed — run: npm install"
  exit 1
fi
if [ ! -e "$chromium" ]; then
  echo "..    Chromium for the test runner is missing — installing it (about 150 MB)"
  npx playwright install chromium >/dev/null 2>&1 && echo "ok    Chromium installed" || { echo "FAIL  npx playwright install chromium failed — run it by hand"; fail=1; }
else
  echo "ok    Chromium for the test runner is installed"
fi

# The config must load. "No tests found" is fine for a new suite.
list="$(npx playwright test --config="$suite" --project=chromium --list --reporter=json 2>/dev/null)"
echo "$list" | node -e '
  let raw = ""; process.stdin.on("data", d => raw += d).on("end", () => {
    let json; try { json = JSON.parse(raw.slice(raw.indexOf("{"))) } catch { console.log("FAIL  the suite config does not load — run: npx playwright test --config='"$suite"' --list"); process.exit(1) }
    const errors = (json.errors || []).filter(e => !/No tests found/.test(e.message));
    if (errors.length) { console.log("FAIL  the suite does not load:"); errors.forEach(e => console.log("      " + String(e.message).split("\n")[0])); process.exit(1) }
    let n = 0; const walk = s => { n += (s.specs || []).length; (s.suites || []).forEach(walk) }; (json.suites || []).forEach(walk);
    console.log(`ok    config loads, ${n} tests today`);
  });' || fail=1

# Resume state.
coverage="$suite/specs/coverage.md"
if [ -f "$coverage" ]; then
  todo="$(grep -cE '^\|.*\| *to do' "$coverage" || true)"
  rows="$(grep -cE '^\| *[A-Z]+-[0-9]+ *\|' "$coverage" || true)"
  notes="$(ls "$suite"/specs/*.md 2>/dev/null | grep -vE '/(coverage|audit)\.md$' | xargs -n1 basename 2>/dev/null | sed 's/\.md$//' | tr '\n' ' ')"
  echo "ok    resume: $coverage has $rows rules, $todo still to do; notes for: ${notes:-none}"
else
  echo "ok    fresh start: no $coverage yet"
fi

exit "$fail"
