---
name: team-3-build-suite
description: Builds or extends a Playwright test suite from a product spec by exploring the live app with Playwright MCP — flow groups in parallel sub-agents when the scope is large, one test per rule, expected results from the spec — then audits, runs and reports it as an HTML coverage report with the bugs it found. Use when asked to build the test suite, cover the core user flows, add tests for a story ID such as FD-05, cover new or battle stories, continue the suite, or run team-3-build-suite.
allowed-tools:
  - mcp__playwright__*
  - Bash(npx playwright:*)
  - Bash(bash .github/skills/team-3-build-suite/scripts/*)
  - Bash(node .github/skills/team-3-build-suite/scripts/*)
  - Agent
  - SendMessage
  - Read
  - Grep
  - Glob
  - Edit(teams/team-3/**)
  - Write(teams/team-3/**)
---

# Build the test suite from the spec

Three phases with one question to the user between the first two: **discover** what the spec
asks and what the app shows, **ask** which critical areas to add, **build** the tests story by
story, and finish with a report. Run every command from the repository root. Print one line when
each phase starts, and one line per story as it finishes.

## Inputs

These are the only app-specific lines; a prompt that names other values overrides them.

| Input | Default |
| --- | --- |
| Suite folder | `teams/team-3` — tests in `tests/`, notes and reports in `specs/` |
| Spec | the files in `spec/` and `spec/battle/` that hold story headings like `## FD-01 · Title`; others (a README) are not spec. `spec/battle/` appears only at the Battle |
| Address | the variable `FOODORA_URL`, falling back to `https://foodora.lovable.app` |
| Scope | the story IDs in the prompt; none named → every story with a rule that has no test yet |
| Story order | the order path first: FD-01, FD-03, FD-05, FD-06, FD-07; then FD-02, FD-04, FD-08; then any other ID, lowest first |
| Flow groups | stories explored and built together, because one starts where another ends: `FD-01 FD-02` · `FD-03 FD-04` · `FD-05 FD-06 FD-07` · `FD-08`. Any other story joins the group whose pages it extends, or starts its own; at most four groups |

The address is only for exploring. Tests use relative paths; the suite's `playwright.config.ts`
supplies the host. The scripts take these inputs as arguments:

```bash
bash .github/skills/team-3-build-suite/scripts/preflight.sh teams/team-3 FOODORA_URL https://foodora.lovable.app
bash .github/skills/team-3-build-suite/scripts/check-suite.sh teams/team-3
node .github/skills/team-3-build-suite/scripts/run-report.mjs teams/team-3 --spec=spec,spec/battle --url=<address> -- <playwright args>
```

## Phases

1. **Discovery and the checkpoint question** — read [`references/discover.md`](references/discover.md)
   and follow it. It ends with one question to the user; that is the only one in the run.
2. **Build, audit, report** — read [`references/build.md`](references/build.md) and follow it. It
   points to [`references/writing-tests.md`](references/writing-tests.md) before the first test.

**Team mode.** With more than two stories in scope and a tool that can start sub-agents, each
flow group gets a worker that explores and then builds it, all groups at the same time; you stay
the lead — the question, `coverage.md`, the runs, the audit ([`references/workers.md`](references/workers.md)).
Otherwise you do the groups yourself, one after another.

A run that stopped half-way continues where it stopped: `preflight.sh` says what
`specs/coverage.md` already holds, and discovery skips what is done.

## Done when

- `<suite>/specs/report.html` was written by the final full run, and `coverage.md` gives every
  rule in scope a status: `pass`, `fail — bug`, `flaky` or `not covered — <reason>`. No rule is
  left `to do` or `fail — triage`.
- `check-suite.sh` printed `check-suite passed`, and `specs/audit.md` has no open `COPIED`,
  `WEAKER` or `WRONG` row.
- In chat: the one-line-per-story summary `run-report.mjs` printed, one line per bug (ID, the spec
  line, what the app did — or `Bugs: none`), anything **seen outside scope**, and the report's
  path.

## Rules

- Expected results come from the spec (and the user's checkpoint answers), never from what the
  app shows. When they disagree, the test stays red with a `bug` annotation: that is the finding.
- A step that cannot run — the page does not load, an element is missing — is a finding with
  what you saw. Do not look for another route.
- The Playwright MCP browser is one browser for the whole session: only one agent drives it at a
  time. Any other agent explores with `scripts/explore.mjs`, which opens a browser of its own.
- Never read `solutions/` folders, `SPOILERS-app-notes.md` or `docs/battle/`. Never open or print
  `.env`; the scripts read the one line they need.
- Write files only inside the suite folder (the tools' own output — `.playwright-mcp/`,
  `test-results/`, `playwright-report/` — is fine). Do not edit `playwright.config.ts`, the spec
  or other teams' folders. Do not commit or push.
- Do not save notes with the chat's memory tool: findings go in `specs/` and the tests.
