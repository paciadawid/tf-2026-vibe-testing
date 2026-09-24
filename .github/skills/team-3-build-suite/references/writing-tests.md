# Writing and triaging the tests

Read this before writing the first test of a run.

- [Files and names](#files-and-names)
- [From snapshot to locator](#from-snapshot-to-locator)
- [Assertions](#assertions)
- [Independent tests and helpers](#independent-tests-and-helpers)
- [Rules a happy path never reaches](#rules-a-happy-path-never-reaches)
- [A test failed: whose fault?](#a-test-failed-whose-fault)

## Files and names

- One file per story: `tests/<id>-<slug>.spec.ts`, e.g. `tests/fd-05-cart.spec.ts`.
- One `test.describe` per file, titled `<ID> · <story title>` and tagged with the ID; **one test
  per rule**, its title starting with the ID and equal to the Test title in `coverage.md`. A test
  that checks five rules stops at the first failure and never checks the other four.
- Every test carries a `spec` annotation quoting the spec line it checks, word for word. The
  report shows it next to the result, and the audit checks each `expect` against it.

```ts
import { test, expect } from '@playwright/test'

test.describe('FD-05 · Cart and totals', { tag: '@FD-05' }, () => {
  test(
    'FD-05 · service fee is a flat amount per order',
    { annotation: { type: 'spec', description: 'Service Fee is a flat **$1.50** per order.' } },
    async ({ page }) => {
      // …
    },
  )
})
```

- An area the user added at the checkpoint that no spec story covers: use the closest story's ID,
  or `EX-01 · …` onwards when none fits, with the user's words as the `spec` description.
- `check-suite.sh` fails the suite when a title, tag or `spec` annotation is missing.

## From snapshot to locator

The MCP snapshot is the page's accessibility tree, the same tree `getByRole` reads. Translate the
line you acted on; never copy a ref (`e15`) into a test — refs exist only inside one snapshot.

| Snapshot line | Locator |
| --- | --- |
| `button "Place Order"` | `page.getByRole('button', { name: 'Place Order' })` |
| `link "View All"` | `page.getByRole('link', { name: 'View All' })` |
| `heading "Menu" [level=2]` | `page.getByRole('heading', { name: 'Menu', level: 2 })` |
| `textbox "City"` | `page.getByLabel('City')` or `page.getByRole('textbox', { name: 'City' })` |
| `radio "…"`, `checkbox "…"`, `combobox "…"`, `tab "…"` | `getByRole` with that role and name |
| `button [ref=e42]` — no name | a finding (unnamed control), not something to locate by index |

- A name matches as a substring by default. When the spec gives the exact words, add
  `exact: true`. A name that carries changing data (a count, a price): match its stable part
  with a regex, `{ name: /^Cart\b/ }`.
- Narrow to a region before picking inside it: `page.getByRole('dialog')`, a `listitem` or
  `article` `.filter({ hasText: 'Dish name' })`, then the control inside it.
- No CSS classes, no XPath, no `nth()` unless the rule is about order. The app may have no test
  ids; roles, labels and text are what a user sees, and what survives a redesign.

## Assertions

- Web-first only: `await expect(locator).toBeVisible()`, `toHaveText`, `toContainText`,
  `toHaveCount`, `toHaveURL`, `toBeDisabled`. They wait for content that loads late; a manual
  sleep does not belong in a test (`check-suite.sh` rejects `waitForTimeout` and `networkidle`).
- For a value computed from several elements, `await expect.poll(() => …).toBe(…)`.
- **Relationships over literals.** Read the values at run time and assert what the spec relates:
  the count goes up by one, the total equals the sum of its lines, the price changes when an
  option changes. Parse money once in a helper (`'$12.99'` → `1299` cents) to avoid float drift.
- A literal is allowed only when the spec itself states it: a fixed fee, a format such as
  `FDR-` plus six characters, a heading's exact words. Never a price, a name or a count you saw
  in the app — the next build changes it and the test fails on the fact instead of the rule.

## Independent tests and helpers

- Every test starts from nothing — `page.goto('/…')` with a fresh context, which Playwright gives
  each test — and builds its own state. No `test.describe.serial`, no order between tests, nothing
  carried over from exploration: the MCP browser kept its storage, the test's browser does not.
- Setup that several stories repeat (open an available item, put one in the cart, fill a form)
  goes into `tests/helpers.ts` as small functions that act and then `expect` they arrived. Tests
  assert; helpers set up. Grow helpers from what you wrote twice, not in advance.
- A helper that cannot find what it needs must fail with the reason, not pick something else.

## Rules a happy path never reaches

These are what the checkpoint question is for; check every one against the rules in scope:

- **Direct navigation:** open a later step's route cold (a checkout with nothing in it), or a
  route with an ID that does not exist. That test belongs to the story owning the route; only a
  path the app has no route for belongs to the page-not-found story.
- **Reload and back:** `page.reload()`, `page.goBack()` — does state survive or reset as the spec
  says?
- **Validation:** submit each required field empty, one at a time; the spec's message, and no
  side effect.
- **Tampering:** rules that say a value "cannot be changed in the browser" — change it the way a
  user could (edit the URL, `page.evaluate` on `localStorage`) and assert the app ignores it.
- **Empty and boundary states:** zero items, one item vs several, a threshold just below and just
  above.
- **Accessibility rules:** a control without a name shows up in the snapshot as
  `button [ref=…]`. In the test, loop over `region.getByRole('button').all()` and
  `await expect(button).toHaveAccessibleName(/\S/)` for each.

## A test failed: whose fault?

Run the one file again with `--retries=0` and read the error first.

1. **Locator not found or ambiguous, timeout on something that exists** → the test is wrong.
   Replay that step in the browser you explored with (the MCP tools, or `explore.mjs` with the
   test's steps), take the role and name from the new snapshot, fix the locator. The error's
   `error-context.md` in the run's output folder also holds the page's snapshot at the failure. At most **two** fixes per test; after that, delete the test and set its row in
   `coverage.md` to `not covered — <reason>`.
2. **The app did something the spec forbids** (a wrong total, a missing message, an order placed
   with an empty field) → the app is wrong. Keep the assertion exactly as the spec states it,
   leave the test red, and add a `bug` annotation saying what the app did:

   ```ts
   {
     annotation: [
       { type: 'spec', description: 'Place Order only places the order when every required field is filled in.' },
       { type: 'bug', description: 'The app placed an order with City empty.' },
     ],
   },
   ```

   `run-report.mjs` then reports the row as `fail — bug` with both lines and the screenshot.
   Never change the expected value to match the app, never `test.skip`, `test.fixme` or
   `test.fail` it. A test with a `bug` annotation that passes on a later build is fixed: remove
   the annotation.
3. **Passes alone, fails in the full run or on repeat** → shared state or a race. Find what the
   test assumed (order, leftover data, content not yet loaded) and make it wait on or build that
   itself.
