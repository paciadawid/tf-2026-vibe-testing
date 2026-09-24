# Coverage

Scope of this run: FD-08. Rules are split from `spec/foodora-spec.md` (one bullet = one rule).

| ID | Rule (spec words, shortened) | Test title | Status |
| --- | --- | --- | --- |
| FD-08 | Any address that is not a Foodora page shows **404 — Page not found** and a **Return to Home** link | FD-08 · any address that is not a Foodora page shows 404 — Page not found and a Return to Home link | pass |

## Bugs

None found for the FD-08 rules in scope. Open questions from exploration (not tested, the user
kept the plan as is at the checkpoint) are in `specs/fd-08.md`: `/restaurant/<unknown id>` and
`/product/<unknown id>` show their own "Not Found" screens without **Return to Home**.

## Last run

- `check-suite.sh teams/team-3`: `ok    check-suite passed`
- `--repeat-each=3`: `3 passed (1.5s)`
