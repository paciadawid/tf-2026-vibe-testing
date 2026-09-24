# Build, audit, report

`<suite>`, the spec and the address are the Inputs in `SKILL.md`; `run-report` below is
`node .github/skills/team-3-build-suite/scripts/run-report.mjs <suite> --spec=<spec dirs> --url=<address> --`
followed by the Playwright arguments shown.

Read [`writing-tests.md`](writing-tests.md) now.

## 1. Per story: write, run, triage

**Team mode** (discovery ran with workers): send every worker the builder prompt from
[`workers.md`](workers.md) in one message, wait for all of them, then do its Merge section — it
ends with one `run-report` over the whole suite — and go on with step 2. As each worker returns,
print one line: its stories and how many tests pass, fail with a bug, or are not covered.

**Alone:** work through the stories in scope in the story order from the Inputs:

1. **Write** `<suite>/tests/<id>-<slug>.spec.ts` (lower case: `fd-05-cart.spec.ts`) from the
   notes: one test per `to do` row, titled exactly as the row's Test title, with the story tag on
   the `describe` and a `spec` annotation on every test. Setup that a second story repeats goes
   into `<suite>/tests/helpers.ts`; no repeat, no file.
2. **Run that file:** `run-report --retries=0 fd-05-`. It updates the story's rows in
   `coverage.md`, copies the screenshot of every red test to `specs/bugs/`, and prints the
   story's line (`FD-05 · 7 rules · 5 pass · 1 bug · 1 to triage`). Show that line in chat.
3. **Triage every `fail — triage` row** with the decision tree in `writing-tests.md`: a wrong
   test is fixed at most twice, then set to `not covered — <reason>`; a wrong app gets a `bug`
   annotation and stays red. Run the file again until the story has no `fail — triage` left.

## 2. Check the rules

`bash .github/skills/team-3-build-suite/scripts/check-suite.sh <suite>` must print
`check-suite passed`. Fix what it lists and run it again.

## 3. Audit the assertions

The author of a test is the worst reviewer of it. If your tool can start a sub-agent (Claude
Code: the Agent tool), give a **fresh** one the prompt below, filled in; otherwise do it yourself,
one file at a time, re-reading the spec line before each file.

> Audit the Playwright tests in `<the test files written or changed in this run>` against the
> spec in `<spec files>`. Do not edit any test. Do not read `solutions/` folders,
> `SPOILERS-app-notes.md` or `docs/battle/`. Write `<suite>/specs/audit.md`: a table with one row
> per `expect(…)` — file:line, the assertion, the verdict, why — then a list of rules quoted in a
> test's `spec` annotation that no `expect` checks. Verdicts:
> **SPEC** — the expected value or behaviour is stated in the test's `spec` line;
> **RELATION** — a relationship the spec states, with the values read at run time;
> **COPIED** — a literal (price, name, count, text) that is not in the spec: taken from the app;
> **WEAKER** — checks less than the spec line says (visible instead of the exact text, a count
> instead of the values, `toBeTruthy`);
> **WRONG** — contradicts the spec, including a test with a `bug` annotation whose `expect`
> accepts what the app does instead of what the spec says.
> End with the counts per verdict.

Fix every `COPIED`, `WEAKER` and `WRONG` row and every unchecked rule, run the changed files
again (`run-report --retries=0 <files>`), and mark the row `fixed` in `audit.md`. A fix that turns
a test red is a finding, not a mistake: triage it.

## 4. Stability

`run-report --retries=0 --repeat-each=3 <the files written in this run>`. A test whose result
changes between repeats shows as `flaky`: fix it (triage point 3 in `writing-tests.md`) and repeat.
Never retry it green.

## 5. Final run and report

`run-report` with no Playwright arguments: the whole suite, with the config's retries. It writes
`<suite>/specs/report.html` and sets every row's status from this run. Then check the Done-when
list in `SKILL.md` and give the summary in chat.
