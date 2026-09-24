---
name: team-3-build-suite
description: Builds or extends a Playwright test suite from a product spec by exploring the live app with Playwright MCP — one story at a time, one test per rule, expected results from the spec — then runs it and reports coverage and bugs. Use when asked to build the test suite, cover the core user flows, add tests for a story ID such as FD-05, cover new or battle stories, or run team-3-build-suite.
---

# Build the test suite from the spec

Two phases with one question to the user between them: **discover** what the spec asks and what
the app shows, **ask** which critical areas to add, then **build** the tests story by story. Run
every command from the repository root.

## Inputs

These are the only app-specific lines; a prompt that names other values overrides them.

| Input | Default |
| --- | --- |
| Suite folder | `teams/team-3` — tests in `tests/`, notes in `specs/` |
| Spec | the files in `spec/` and `spec/battle/` that hold story headings like `## FD-01 · Title`; others (a README) are not spec. `spec/battle/` appears only at the Battle |
| Address | `bash .github/skills/team-3-build-suite/scripts/base-url.sh FOODORA_URL https://foodora.lovable.app` prints it |
| Scope | the story IDs in the prompt; none named → every story with a rule that has no test yet |
| Story order | the order path first: FD-01, FD-03, FD-05, FD-06, FD-07; then FD-02, FD-04, FD-08; then any other ID, lowest first |

The address is only for exploring. Tests use relative paths; the suite's `playwright.config.ts`
supplies the host.

## Discovery

1. **Preflight.** Print the address with the command above. Open it with the Playwright MCP
   `browser_navigate` tool (listed as `mcp__playwright__browser_navigate` or similar). No
   `browser_*` tool available: **stop** and tell the user to connect Playwright MCP — Claude Code:
   `claude mcp add playwright -- npx @playwright/mcp@latest`, then a new session; VS Code: add the
   server in **MCP: Add Server**. Do not fall back to another browser tool.
2. **Rule inventory.** Read the spec. Split each story in scope into rules: one bullet, one table
   row, one sentence under *Rules* is one rule. A rule that names several things one page shows
   ("shows X and a Y link") stays one test with several `expect`s; a separate behaviour ("Y
   leads back home") is its own rule. A rule whose wording allows two readings: test the one a
   customer would expect, write `reading: …` next to it, and offer the other at the checkpoint.
   Read the titles in `<suite>/tests/*.spec.ts`: a rule has a test when a title carries its ID
   and says that rule.
3. **Explore each story in scope** with the MCP tools: `browser_navigate`, `browser_snapshot`,
   `browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`, and
   `browser_wait_for` with the **text** you expect (never with a time) for content that loads
   late. Start each story from a clean state — navigate to the address, `browser_evaluate` with
   `() => { localStorage.clear(); sessionStorage.clear() }`, navigate again. Walk the story's path
   and trigger each rule once. Refs change with every action: take the next ref from a snapshot
   taken after the last action. Screenshots only when a snapshot cannot show it. Keep to about
   15 actions per story. A page that does not exist (an unknown ID in a route) belongs to the
   story that owns the route, not to the page-not-found story.
4. **Write the notes.** For each story, `<suite>/specs/<id>.md`: the routes, and for every element
   you touched its role and accessible name as the snapshot shows them; content that loads late;
   anything that renders in place instead of navigating; every place where the app already
   contradicts the spec, quoting the spec line. Then `<suite>/specs/coverage.md`:

   | ID | Rule (spec words, shortened) | Test title | Status |
   | --- | --- | --- | --- |

   Status now is `has test`, `to do`, or `to do — manipulation` for a rule a happy path never
   reaches (the list is in the reference). Step 8 replaces every status with the run's result.
   Under the table, a **Seen outside scope** section: contradictions you noticed in stories not
   in scope, with the spec line — they are findings too.

## Checkpoint — always ask

5. Ask the user **one** question with the question tool (Claude Code: AskUserQuestion; elsewhere,
   ask in chat and wait). Put the plan's size in the question — "N stories, M rules, K to write".
   `multiSelect`, the options in this order:
   1. **Continue with the plan (Recommended)** — nothing to add.
   2. – 4. Up to three candidates you found in discovery that a test suite could easily bypass:
      rules marked `to do — manipulation`, the other reading of an ambiguous rule, app behaviour
      no spec rule covers, and negative paths — direct navigation to a later step, reload, empty
      or invalid input. Name each one concretely ("Checkout opened directly with an empty cart").

   Option 1 means "nothing to add" only when it is the sole pick; picked with others, add the
   others. Add every picked candidate, and anything the user typed, to `coverage.md` as `to do`,
   with the user's words as the expected result where the spec says nothing. Then continue
   without asking again.

## Build

Read [`references/writing-tests.md`](references/writing-tests.md) first. Then, per story in
scope, in the story order from Inputs:

6. **Write** `<suite>/tests/<id>-<slug>.spec.ts` (lower case: `fd-05-cart.spec.ts`) from the
   notes: one test per `to do` rule, titled `<ID> · <rule>`, the spec line quoted above it.
   Setup that a second story repeats goes into `<suite>/tests/helpers.ts`; no repeat, no file.
7. **Run that file:**
   `npx playwright test --config=<suite> --project=chromium --retries=0 fd-05-`
   Every failure goes through the triage in the reference: a wrong test is fixed at most twice; a
   wrong app keeps its red test and a `// BUG <ID>:` comment. Update the story's rows in
   `coverage.md` — `pass`, `fail — bug`, or `not covered — <reason>` — before the next story.
8. **Check the rules and stability.** When all stories are written:
   `bash .github/skills/team-3-build-suite/scripts/check-suite.sh <suite>` must print
   `check-suite passed` — fix what it lists and run it again. Then run the files written in this
   run with `--retries=0 --repeat-each=3` added to the step 7 command, filtering by their names.
   A test whose result changes between repeats is flaky: fix it (triage point 3), do not retry it
   green. Last, run the whole suite once, `npx playwright test --config=<suite> --project=chromium`,
   and set every row's status in `coverage.md` from it.

## Done when

Show in chat, and keep in `<suite>/specs/coverage.md`:

- The coverage table: every rule in scope with its test title and `pass`, `fail — bug` or
  `not covered — <reason>`. No rule is left without a status.
- **Bugs:** one line per bug — the ID, the spec line quoted, what the app did — or `Bugs: none`.
- **Seen outside scope**, if anything was.
- The repeat run's and the full run's result lines (passed / failed counts) and
  `check-suite passed`.

## Rules

- Expected results come from the spec (and the user's checkpoint answers), never from what the
  app shows. When they disagree, the test stays red: that is the finding.
- A step that cannot run — the page does not load, an element is missing — is a finding with
  what you saw. Do not look for another route.
- Never read `solutions/` folders, `SPOILERS-app-notes.md` or `docs/battle/`. Never open or print
  `.env`; `base-url.sh` reads the one line it needs.
- Write files only inside the suite folder (the tools' own output — `.playwright-mcp/`,
  `test-results/`, the HTML report — is fine). Do not edit `playwright.config.ts`, the spec or
  other teams' folders. Do not commit or push.
- Do not save notes with the chat's memory tool: findings go in `specs/` and the tests.
