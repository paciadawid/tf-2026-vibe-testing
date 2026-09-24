#!/usr/bin/env bash
# The suite rules that must always hold. Exits non-zero and prints every violation.
#
#   bash check-suite.sh <suite-folder>        e.g. teams/team-3
#
# Checks: no absolute address in tests/, no sleeps or focused/skipped tests, and that the suite
# compiles with at least one test, where every test's title starts with a story ID
# ("FD-05 · …"), carries that ID as a tag (@FD-05) and a non-empty `spec` annotation.
set -uo pipefail

suite="${1:?usage: check-suite.sh <suite-folder>}"
tests="$suite/tests"
fail=0

report() { echo "FAIL  $1"; fail=1; }

[ -d "$tests" ] || { echo "FAIL  no $tests folder"; exit 1; }

# 1. The address comes from baseURL only.
if hits="$(grep -rnE 'https?://' "$tests" --include='*.ts')"; then
  report "absolute address in a test — use a relative path, baseURL supplies the host:"
  echo "$hits" | sed 's/^/      /'
fi

# 2. Nothing that hides a result or sleeps instead of waiting.
if hits="$(grep -rnE 'waitForTimeout|networkidle|page\.pause\(|\b(test|describe)\.(only|skip|fixme|fail)\(' "$tests" --include='*.ts')"; then
  report "sleep, pause, or focused/skipped/expected-to-fail test:"
  echo "$hits" | sed 's/^/      /'
fi

# 3. Every test compiles and names its story.
list="$(npx playwright test --config="$suite" --project=chromium --list --reporter=json 2>/dev/null)"
if [ -z "$list" ]; then
  report "npx playwright test --config=$suite --list printed nothing — run it by hand to see why"
else
  echo "$list" | node -e '
    let raw = ""; process.stdin.on("data", d => raw += d).on("end", () => {
      const json = JSON.parse(raw.slice(raw.indexOf("{")));
      if (json.errors && json.errors.length) {
        console.log("FAIL  the suite does not load:");
        json.errors.forEach(e => console.log("      " + String(e.message).split("\n").slice(0, 6).join("\n      ")));
        process.exit(1);
      }
      const tests = [];
      const walk = s => { (s.specs || []).forEach(t => tests.push({ ...t, where: `${t.file}:${t.line}` })); (s.suites || []).forEach(walk); };
      (json.suites || []).forEach(walk);
      if (!tests.length) { console.log("FAIL  no tests found"); process.exit(1); }
      const problems = [];
      for (const t of tests) {
        const id = (t.title.match(/^([A-Z]+-\d+) · \S/) || [])[1];
        if (!id) { problems.push(`${t.where}  title must start with a story ID, e.g. "FD-05 · …": ${t.title}`); continue; }
        if (!(t.tags || []).includes(id)) problems.push(`${t.where}  missing tag @${id} (put it on the describe: test.describe("${id} · …", { tag: "@${id}" }, …))`);
        const ann = (t.tests[0] && t.tests[0].annotations) || [];
        if (!ann.some(a => a.type === "spec" && a.description && a.description.trim())) problems.push(`${t.where}  missing annotation { type: "spec", description: "<the spec line>" }: ${t.title}`);
      }
      if (problems.length) { console.log("FAIL  test metadata:"); problems.forEach(p => console.log("      " + p)); process.exit(1); }
      console.log(`ok    ${tests.length} tests, each with its story ID, tag and spec line`);
    });' || fail=1
fi

[ "$fail" -eq 0 ] && echo "ok    check-suite passed" || echo "check-suite FAILED — fix the lines above, then run it again"
exit "$fail"
