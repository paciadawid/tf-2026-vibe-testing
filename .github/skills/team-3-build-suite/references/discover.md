# Discovery and the checkpoint question

`<suite>`, the spec, the address and the scope are the Inputs in `SKILL.md`.

## 1. Preflight

Run `preflight.sh` with the Inputs. Every line must start with `ok`; a `FAIL` line says what is
missing — do what it says once, run it again, and stop with its message if it still fails.

Then open the address with the Playwright MCP `browser_navigate` tool (listed as
`mcp__playwright__browser_navigate` or similar).

- No `browser_*` tool available: **stop** and tell the user to connect Playwright MCP — Claude
  Code: `claude mcp add playwright -- npx @playwright/mcp@latest`, then a new session; VS Code:
  **MCP: Add Server**. Do not fall back to another browser tool.
- The tool answers that its browser is not installed: call `browser_install`, then navigate again.

## 2. Resume or start

Preflight's last line says whether `<suite>/specs/coverage.md` exists.

- **It exists:** read it. A story in scope whose notes file `<suite>/specs/<id>.md` exists and
  whose `Explored against` line names the same address is explored already — skip step 4 for it
  and reuse the notes. A story whose notes name another address (a new build) is explored again.
  Rows left at `fail — triage` from an earlier run go straight to the build phase's triage.
- **It does not:** start fresh.

## 3. Rule inventory

Read the spec. Split each story in scope into rules: one bullet, one table row, one sentence
under *Rules* is one rule.

- A rule that names several things one page shows ("shows X and a Y link") stays one test with
  several `expect`s; a separate behaviour ("Y leads back home") is its own rule.
- A rule whose wording allows two readings: test the one a customer would expect, write
  `reading: …` next to it, and offer the other at the checkpoint.
- A rule has a test when a title in `<suite>/tests/*.spec.ts` carries its ID and says that rule.

## 4. Explore each story in scope

**Split the work first.** Group the stories in scope by the Flow groups input, dropping groups
with nothing left to explore. More than two stories and a tool that can start sub-agents: team
mode — read [`workers.md`](workers.md), launch one worker per group in one message, and continue
with step 5's `coverage.md` part when they have all returned. Otherwise explore the groups
yourself, one after another, with the Playwright MCP tools.

Two browsers, the same method:

- **Playwright MCP** — `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`,
  `browser_select_option`, `browser_press_key`, and `browser_wait_for` with the **text** you
  expect (never with a time) for content that loads late. It keeps its storage: start each story
  by navigating to the address, `browser_evaluate` with
  `() => { localStorage.clear(); sessionStorage.clear() }`, and navigating again. Refs change with
  every action: take the next ref from a snapshot taken after the last action.
- **`explore.mjs`** — a browser of its own, so any number of workers can explore at once. Every
  call starts clean and replays its steps, written as role and name — the locators the test
  will use:

  ```bash
  node .github/skills/team-3-build-suite/scripts/explore.mjs <address> <<'STEPS'
  goto /
  fill textbox "Search for restaurants" burger
  wait "Burger"
  snapshot
  STEPS
  ```

  A step that fails prints the error and the page as it was. Add a step, run again.

For every story: walk its path and trigger each rule once. Screenshots only when a snapshot cannot
show it. About 15 actions (or `explore.mjs` calls) per story. A page that does not exist (an
unknown ID in a route) belongs to the story that owns the route, not to the page-not-found story.

## 5. Write the notes

For each explored story, `<suite>/specs/<id>.md` (lower case, `fd-05.md`): a heading, then the
line `Explored against <address> on <date>.` Then the routes; for every element you touched, its role
and accessible name as the snapshot shows them; content that loads late; anything that renders in
place instead of navigating; every place where the app already contradicts the spec, quoting the
spec line.

Then `<suite>/specs/coverage.md` — add rows for new rules, keep the existing ones. In team mode
only the lead writes it, from the rows the workers returned:

```markdown
| ID | Rule (spec words, shortened) | Test title | Status |
| --- | --- | --- | --- |
| FD-05 | Service Fee is a flat $1.50 per order | FD-05 · service fee is a flat amount per order | to do |
```

Status now is `has test`, `to do`, or `to do — manipulation` for a rule a happy path never
reaches (the list is in `writing-tests.md`). `run-report.mjs` replaces it with the run's result
later. Keep the Test title cell exactly equal to the test's title: that is how the report matches
them. Under the table, a `## Seen outside scope` section: contradictions noticed in stories not in
scope, with the spec line — they are findings too.

## 6. Checkpoint — always ask

Ask the user **one** question with the question tool (Claude Code: AskUserQuestion; elsewhere,
ask in chat and wait). Put the plan's size in it — "N stories, M rules, K to write". `multiSelect`,
the options in this order:

1. **Continue with the plan (Recommended)** — nothing to add.
2. – 4. Up to three candidates found in discovery (in team mode, the best of those the workers
   returned) that a suite could easily bypass: rules marked
   `to do — manipulation`, the other reading of an ambiguous rule, app behaviour no spec rule
   covers, and negative paths — direct navigation to a later step, reload, empty or invalid
   input. Name each one concretely ("Checkout opened directly with an empty cart").

Option 1 means "nothing to add" only when it is the sole pick; picked with others, add the others.
Add every picked candidate, and anything the user typed, to `coverage.md` as `to do`, with the
user's words as the expected result where the spec says nothing. Then go to the build phase
without asking again.
