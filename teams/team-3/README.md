# Team 3 · Coding agent + Playwright MCP

Your team's folder, copied from `teams/_template/` — the `team-setup` skill does it for you. Work
only inside it. The day's steps are in [`playbook/04-build.md`](../../playbook/04-build.md).

- **Team:** Team 3
- **Tool:** c · Coding agent + Playwright MCP
- **Skill:** `.github/skills/team-3-build-suite/` — run it with `run team-3-build-suite`
  (explore, ask once, write the tests, audit them, report)
- **Second skill:** `.github/skills/team-3-triage-run/` — `run team-3-triage-run` re-runs the
  suite against the current build, sorts the red tests into bug, broken test or spec change, and
  rewrites the report
- **How it works:** [`docs/how-it-works.html`](docs/how-it-works.html) — the flow on one page ([PNG](docs/how-it-works.png))
- **Report:** [`specs/report.html`](specs/report.html) — stories × rules, bugs with the spec line
  and a screenshot; [`specs/coverage.md`](specs/coverage.md) is the same table in Markdown

## Checklist

- [ ] Folder in `teams/team-N/`, pull request open (a draft is fine)
- [ ] First test green — **13:30**
- [ ] Tests cover the core user flows (`FD-01` … `FD-08`), and each test names its `FD-xx`
- [ ] App address only in `baseURL` — tests use relative paths like `page.goto('/checkout')`
- [ ] `SKILL.md` drafted — **14:00**
- [ ] Cold run passes: fresh agent session, only the `SKILL.md` and `run team-N-<name>`, no follow-up prompts — **14:20**
- [ ] Pushed, pull request up to date — **14:30**

## Suite

Three business-critical areas, one test per spec rule:

| File | Area | Stories |
| --- | --- | --- |
| [`tests/price-correctness.spec.ts`](tests/price-correctness.spec.ts) | What the customer pays | FD-03, FD-04, FD-05 |
| [`tests/checkout-gate.spec.ts`](tests/checkout-gate.spec.ts) | Whether an order can be placed | FD-06 |
| [`tests/order-integrity.spec.ts`](tests/order-integrity.spec.ts) | Proof the order exists, and what was paid | FD-07 |

Shared setup is in [`tests/helpers.ts`](tests/helpers.ts).

## Findings: app vs. spec

Against `https://foodora.lovable.app` on 2026-09-24, 29 tests pass and 13 fail. Each failing test
checks one spec rule, so these are bugs in the build, not broken tests:

| Spec | Rule | What the build does |
| --- | --- | --- |
| FD-03 | Icon-only buttons have an accessible name | Quick-add **+** has no name. The cart's − / + / remove buttons don't either |
| FD-04 | Add-ons: any combination | Add-ons are radio buttons, so picking Bacon unselects Extra Cheese |
| FD-04 | Cart reachable from the dish page | The dish page has no Cart button |
| FD-05 | Delivery Fee = advertised fee, Free = $0.00 | Pizza Corner advertises Free, but the cart charges $2.99 |
| FD-05 | 20% OFF over $25 applied automatically | Subtotal $27.94 at Burger Palace gets no discount line, and the total is $32.43 |
| FD-05 | Cart survives a page reload | The cart is empty after a reload |
| FD-06 | Place Order only with every required field | A blank form, or one missing any single required field, places the order |
| FD-07 | Tracking only for real orders | `/order/FDR-NOPE00` shows a tracking page |
| FD-07 | Total paid can't be changed in the address | `?total=0.01` in the tracking URL shows **Total Paid $0.01** |

## Run

```bash
cd teams/team-N
npx playwright test
```

## What is here

| Where | What |
| --- | --- |
| [`playwright.config.ts`](playwright.config.ts) | Reads the app address from `FOODORA_URL` in the repository's `.env`. Keep the project name `chromium` |
| [`tests/`](tests/) | Your tests |
| `SKILL.md` | The starting point for your skill. `team-setup` moves it to `.github/skills/team-N-<name>/SKILL.md` at the repository root, where your agent finds it; by hand, move it there and set `name` to `team-N-<name>` |
