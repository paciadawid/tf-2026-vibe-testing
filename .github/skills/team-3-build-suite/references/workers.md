# Team mode: one agent per flow group

Use it when more than two stories are in scope and your tool can start sub-agents (Claude Code:
the Agent tool). You are the **lead**: you run the preflight, the inventory, the checkpoint
question, every edit to `coverage.md`, every `run-report` and `check-suite`, and the audit. Each
flow group from the Inputs gets one **worker** that explores it, then builds it.

## Who writes what

Two agents never write the same file, and never drive the same browser.

| Thing | Owner |
| --- | --- |
| The Playwright MCP browser (one for the whole session) | the worker of the **largest** group; everyone else, you included, keeps off it while workers run |
| Own browsers | every other worker: `explore.mjs` to explore, `npx playwright test` to run |
| `specs/<id>.md`, `tests/<id>-*.spec.ts` | the worker whose group holds `<id>` |
| `tests/helpers-<group>.ts` | that group's worker (name the group after its first story: `helpers-fd-05.ts`) |
| `specs/coverage.md`, `specs/report.html`, `specs/audit.md`, `tests/helpers.ts`, `run-report.mjs` | the lead |

## Launch

Start all workers **in one message**, so they run at the same time, each with the explorer prompt
below filled in. Wait for every one to return before the checkpoint question: its candidates go
into that question, and its rows into `coverage.md`.

After the checkpoint, **continue the same worker** with the builder prompt when your tool can
(Claude Code: `SendMessage` to it) — it still has the pages in mind. Otherwise start a new worker
with the builder prompt; it reads the notes. Again all in one message.

## Explorer prompt

> You explore `<stories>` of the app at `<address>` for a Playwright suite in `<suite>`. Work
> from the repository root. Read `.github/skills/team-3-build-suite/references/discover.md`
> steps 4 and 5, and follow them for your stories only. Browser: **`<browser>`** — either "the
> Playwright MCP tools; you are the only agent using them", or "`explore.mjs` (usage at the top
> of `.github/skills/team-3-build-suite/scripts/explore.mjs`); do not use the Playwright MCP
> tools, another agent is driving that browser". Rules: `<paste the rules in scope, with IDs>`.
> Write only `<suite>/specs/<id>.md` for your stories. Do not edit `coverage.md`. Never read
> `solutions/`, `SPOILERS-app-notes.md`, `docs/battle/`; never open `.env`. Return, and nothing
> else: (1) the coverage rows for your rules as a Markdown table `| ID | Rule | Test title |
> Status |`; (2) up to three checkpoint candidates — rules a suite could easily bypass, named
> concretely; (3) contradictions you saw in stories outside yours, with the spec line.

## Builder prompt

> Build the tests for `<stories>` in `<suite>`. Read
> `.github/skills/team-3-build-suite/references/writing-tests.md` first, then your notes in
> `<suite>/specs/<id>.md`. One test per row: `<paste the group's rows, including the ones the
> user added at the checkpoint, with their expected result>`. Write only
> `<suite>/tests/<id>-<slug>.spec.ts` for your stories and, if a setup repeats, `<suite>/tests/helpers-<group>.ts`.
> Run only your files, with an output folder of your own:
> `npx playwright test --config=<suite> --project=chromium --retries=0 --reporter=line --output=<suite>/test-results/<group> <file filter>`.
> Triage each red test as `writing-tests.md` says; to replay a step use `<browser>`. Do not run
> `run-report.mjs` or edit `coverage.md`. Return, and nothing else: per test its title, `pass`,
> `fail — bug` (with the bug annotation) or `not covered — <reason>`, and the files you wrote.

## Merge

When every builder has returned: run `run-report --retries=0` once for the whole suite, which sets
every row's status and prints the story lines. Any row still `fail — triage` goes back to its
worker (`SendMessage`) or you triage it yourself. Setup that two groups' helpers repeat may move
into `tests/helpers.ts` — only now, with no worker running. Then continue with step 2 of
`build.md`.
