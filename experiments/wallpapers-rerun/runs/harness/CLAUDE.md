Git: Never Commit Unasked
Do not run git commit or git push unless I explicitly ask for it in that message. Finishing a piece of work is not permission to commit it.

Instead, end your last message with a ready-to-paste command block so I can review the diff first and commit it myself:

git add src/report/signature.ts src/report/identity.ts
git commit -m "add: cluster failures by normalized error signature"
Include the git add line with the exact paths, so the block works as a single copy-paste. If some changed files should stay out of the commit, say which and why rather than staging them.

When I do ask for a commit, the same message rules below still apply.

Exception: while running a loop command (`/implement-ticket`, `/address-review`, `/fix-test`) you may commit on that ticket's
branch, push that branch and open its PR against `main` without asking (I review in the PR, not in the working tree). Merging is
always mine, and so is anything else on GitHub (closing a PR, deleting a branch, pushing `main`).
Every commit a loop command makes ends with a body line `[agent - Claude]` (`scripts/loop-metrics.mjs` uses it to tell agent
commits from human edits), and its message still follows the rules below.

Merge: every PR is merged with Squash and merge, never a merge commit or rebase; the squash subject follows the commit rules
below and keeps the `[agent - Claude]` body line when the branch has agent commits.

Branches: a branch name always starts with the Jira key, then a short kebab-case form of the ticket title, e.g.
`ZED-12-ringtones-search`. The title part is a recommendation (shorten a long title); the key prefix is required.

Git Commit Messages
When asked to generate a commit message, run git diff --staged (or git diff HEAD if nothing staged) to review the actual changes, then produce the full ready-to-run command with the message already substituted, e.g.:

git commit -m "add: make AppManifest optional in analyzeReport"
Rules:

Subject line ≤ 72 chars, imperative mood ("add:", "fix:", "upd:", "del:", "made:")
No period at the end
If multiple unrelated changes, list them as a short multi-line message using $'line1\nline2' syntax
Do not include "Co-Authored-By" unless the user asks

# Project Conventions

Black-box E2E suite for the zedge.net sections (guest only), one area at a time. Scenarios live in `specs/<area>.plan.md` as
`<PREFIX>-XX`; the first loop is described in `specs/agentic-qa-loop.plan.md`, the working one in `specs/agentic-qa-loop-v2.plan.md`.

## Areas

| Area                | Tag                    | ID prefix | Plan                                | Tests                        | Page objects                 | Entry point                             |
| ------------------- | ---------------------- | --------- | ----------------------------------- | ---------------------------- | ---------------------------- | --------------------------------------- |
| wallpapers          | `@wallpapers`          | `WP`      | `specs/wallpapers.plan.md`          | `tests/wallpapers/`          | `pages/` (flat, from v1)     | `app.wallpapersListPage.open()`         |

- A new area gets its own `pages/<area>/` folder, `tests/<area>/` folder, plan file and ID prefix. IDs are never reused.
- Shared components (`HeaderPage`, `FooterPage`, `MainHeaderPage`, `BuyModalPage`) stay in `pages/` and are reused by the new
  area, not copied. Before adding a locator or helper search `pages/` for it (a duplicate is a `[dup-pom]` review finding). A helper
  with the same shape as one for another area (a card or list validator) is not copied and not deferred to a later group: extract
  one shared helper parameterised by the difference (`pages/CardLinkValidator.ts`), switch the old code to it and re-run that area's smoke tests.
- `AppPageObjects` gets one property per area entry page. The entry page's `open(path)` keeps the wallpapers contract: navigate,
  wait for the list heading, then `dismissCookieBanner` (`src/utils/helper.ts`).
- The area tag is registered in `src/utils/tags.ts` before the first test uses it.

## Language

Code, comments, test titles, commit messages and Jira comments are in English.

## Skill

Before writing or editing a test, invoke the `playwright-best-practices` skill. The rules in this file win over the skill.

## Writing tests

- Import `test` and `expect` from `fixtures/test`, never from `@playwright/test`. Use the `app` fixture and call page objects
  explicitly (`app.wallpapersListPage.open()`); do not destructure them out of `app`.
- Open any area URL (`/wallpapers/...`, `/ringtones/...`) through the entry page's `open(path)` (see `## Areas`), not `page.goto()`
  (the cookie banner race).
- Locators and helpers live in `pages/`; the list page delegates to components (`app.wallpapersListPage.filtersBar`, `.filterDrawer`,
  `.downloadFlow`). Search for an existing one before adding a new one. Assertions that belong to a
  component go in its `validate*` methods.
- Every repeating part of an area page (filter bar, card grid, drawer) is its own component class in `pages/<area>/`, held by the
  list page as one property (`app.ringtonesListPage.cards`, `.filtersBar`). Its locators, per-item validators and settled count
  live there, not on the list page. Tests reach components only through the area entry page: no top-level `app.filterBar`, no
  `const bar = app.x.filtersBar` alias, no `expect(app.x.component.locator)` (ESLint `no-restricted-syntax` in `tests/<area>/`,
  every area after wallpapers).
- A live list has no fixed size and may still be rendering: never take a one-shot `await locator.count()` as the number to check.
  Read it once it stops changing (`app.ringtonesListPage.cards.validateFirst(limit)`), or use `expect.poll` / `toHaveCount`.
- No `waitForTimeout`, no `force: true` (close an open filter dropdown with `closeFilter()`, i.e. Escape), no conditionals in a test body. Data-driven variants carry plain data only,
  never functions or branches. In `pages/<area>/` no `if (...) return` guard either (a check that skips itself in another state
  is silent; ESLint enforces it): assert the expected state and pick the branch from data.
- A test ID and title (`WP-XX ...`) is never renamed; only tags are added or changed.
- Tags (`src/utils/tags.ts`): the area tag (`@wallpapers`, `@ringtones`) and `@guest` go on the `describe`, never on a test. `@smoke` marks a P1 scenario
  from the area plan (runs on every PR), `@regression` the rest; push to main runs everything. `@download` and
  `@BUG:<KEY>` are added on top. ESLint (`require-tags`, `valid-test-tags`) enforces that a test has tags and only known ones.
- Bug tests assert the current (buggy) behavior and stay green: tag `@BUG:<JIRA-KEY>` plus an annotation
  `{ type: 'bug', description }`. When the site is fixed the test fails and is reviewed.
- Do not create per-ticket plan files. New scenarios go into the plan of their area.
- Comments only for a non-obvious "why", one or two lines, never a block.

## Running tests

- Claude runs tests, probes and MCP browsers headless only.
- Before handing over new or changed tests run `npm run verify` (each test repeated, stable/flaky/failing verdict). It finds
  the Jira ticket from the `@BUG:<KEY>` tag; never pass a ticket by hand.
- `npm run lint`, `npx tsc --noEmit` and `npm run format:check` must be clean.
- Optional: if a global `systematic-debugging` skill is installed, use it to find the root cause of a flaky or failing test
  before changing anything; it is not vendored, so skip this when it is missing.

## Jira and the agent loop

- Every comment the automation posts starts with the marker `[agent - Claude]` on its own line (`AGENT_MARKER` in
  `scripts/jira-common.mjs`).
- The automation comments, sets the one state label, assigns me and moves a Subtask: `To Do` > `In Progress` when
  `/implement-ticket` starts, `Blocked` on a `BUDGET STOP:` or a bug gate, back to `In Progress` when work resumes, `Done` in
  `/group-retro` once its PR is merged. A Story goes to `Done` only when every Subtask is `Done`; the Story's other statuses
  (including `In Progress`, the plan gate) are mine, and a Bug's status is always mine (`jira-ticket.mjs transition` refuses both).
  A bug that was not reproduced becomes `needs-manual-repro`, never "not a bug".
- It @mentions me (`jira-ticket.mjs comment --mention`) only when I am needed or the work is finished: PR opened and
  self-reviewed (ready for my review), a Subtask `Blocked`, a Subtask `Done`, a `BUDGET STOP:`. No mention for
  `To Do` > `In Progress`, `Blocked` > `In Progress` or a routine label change.
- Repro runs against production without destructive actions (no login, no purchase).

Changed the control logic of the loop (steps, gates, statuses, who acts)? Update specs/loop-map.md (diagram and a log line) in the same commit.
