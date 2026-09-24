---
name: team-3-triage-run
description: Runs an existing spec-traced Playwright suite against the current build of the app, sorts every red test into app bug, broken test or spec change, repairs the broken tests, annotates the bugs, and rewrites the HTML coverage report. Use when asked to run or re-run the suite, check a new build or a new address, triage failing tests, refresh the report, or run team-3-triage-run.
allowed-tools:
  - mcp__playwright__*
  - Bash(npx playwright:*)
  - Bash(bash .github/skills/team-3-build-suite/scripts/*)
  - Bash(node .github/skills/team-3-build-suite/scripts/*)
  - Agent
  - Read
  - Grep
  - Glob
  - Edit(teams/team-3/**)
  - Write(teams/team-3/**)
---

# Run the suite and triage what is red

This skill writes no new coverage: it keeps an existing suite honest against a new build. It
reuses the scripts and the reference of `team-3-build-suite`; run every command from the
repository root. Uncovered stories are reported at the end; `team-3-build-suite` covers them.

## Inputs

The same as `team-3-build-suite` (see its `SKILL.md`): suite `teams/team-3`, spec in `spec/` and
`spec/battle/`, address from `FOODORA_URL` with fallback `https://foodora.lovable.app`. A prompt
that names other values overrides them. `run-report` below is
`node .github/skills/team-3-build-suite/scripts/run-report.mjs <suite> --spec=<spec dirs> --url=<address> --`
followed by the Playwright arguments shown.

## Steps

1. **Preflight:** `bash .github/skills/team-3-build-suite/scripts/preflight.sh <suite> <VARIABLE> <FALLBACK>`.
   A `FAIL` line: do what it says once, then stop with its message. No `coverage.md` or no
   tests: stop and say to run `team-3-build-suite` first.
2. **Full run:** `run-report --retries=0`. It prints one line per story and sets every row's
   status. Show the lines in chat.
3. **Triage each red or flaky test**. Red tests in more than one flow group and a tool that can
   start sub-agents: one worker per group, all in one message, with the ownership and the
   browser split of `team-3-build-suite/references/workers.md` — each triages its group's tests
   with this step and runs only its files, with its own `--output`; you rerun and report. Alone:
   one test at a time. Read the error and the screenshot `run-report` copied to
   `<suite>/specs/bugs/`, then replay the failing step on the address — with the Playwright MCP
   tools (clean state first, as in `team-3-build-suite/references/discover.md`) or `explore.mjs`.
   Decide with the table, then act as
   [`writing-tests.md`](../team-3-build-suite/references/writing-tests.md#a-test-failed-whose-fault) says:

   | What you see | Verdict | Action |
   | --- | --- | --- |
   | The element is there under another role or name, or appears later | broken test | fix the locator or the wait, at most twice; then `not covered — <reason>` |
   | The app does what the spec forbids | app bug | keep the assertion; add or update the `bug` annotation with what the app did |
   | A `bug` test now passes | fixed bug | remove the `bug` annotation |
   | The spec file changed since the test was written (its `spec` annotation no longer matches the spec's words) | spec change | update the annotation and the assertion to the new words; say so in chat |
   | Different result on repeat | flaky | find the shared state or race; never retry it green |

4. **Rerun what you changed:** `run-report --retries=0 <files>`, until no row is left at
   `fail — triage`, then `bash .github/skills/team-3-build-suite/scripts/check-suite.sh <suite>`,
   which must print `check-suite passed`.
5. **Final run:** `run-report` with no Playwright arguments. It rewrites `<suite>/specs/report.html`.

## Done when

- No row is `fail — triage`; `check-suite passed`; the final run wrote the report.
- In chat: the story lines from the final run; one line per verdict you reached (test title,
  verdict, what changed); the bugs (ID, spec line, what the app did — or `Bugs: none`); the
  stories in the spec with no row in `coverage.md`; the report's path.

## Rules

- Expected results come from the spec, never from the app. A verdict of "app bug" never changes
  an expected value, and nothing is skipped, `fixme`d or `fail`ed.
- Never read `solutions/` folders, `SPOILERS-app-notes.md` or `docs/battle/`. Never open or print
  `.env`.
- Write only inside the suite folder (tool output folders are fine); do not edit
  `playwright.config.ts` or the spec. Do not commit or push. Do not save notes with the memory tool.
