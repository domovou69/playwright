Git: Never Commit Unasked
Do not run git commit or git push unless I explicitly ask for it in that message. Finishing a piece of work is not permission to commit it.

Instead, end your last message with a ready-to-paste command block so I can review the diff first and commit it myself:

git add src/report/signature.ts src/report/identity.ts
git commit -m "add: cluster failures by normalized error signature"
Include the git add line with the exact paths, so the block works as a single copy-paste. If some changed files should stay out of the commit, say which and why rather than staging them.

When I do ask for a commit, the same message rules below still apply.

Exception: while running a loop command (`/implement-ticket`, `/address-review`, `/fix-test`) you may commit on that ticket's
branch without asking. Pushing, opening a PR and merging still need my explicit request (merging is always mine).
Every commit a loop command makes ends with a body line `[agent - Claude]` (`scripts/loop-metrics.mjs` uses it to tell agent
commits from human edits), and its message still follows the rules below.

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

| Area       | Tag           | ID prefix | Plan                       | Tests               | Page objects             | Entry point                     |
| ---------- | ------------- | --------- | -------------------------- | ------------------- | ------------------------ | ------------------------------- |
| wallpapers | `@wallpapers` | `WP`      | `specs/wallpapers.plan.md` | `tests/wallpapers/` | `pages/` (flat, from v1) | `app.wallpapersListPage.open()` |
| ringtones  | `@ringtones`  | `RT`      | `specs/ringtones.plan.md`  | `tests/ringtones/`  | `pages/ringtones/`       | `app.ringtonesListPage.open()`  |

- A new area gets its own `pages/<area>/` folder, `tests/<area>/` folder, plan file and ID prefix. IDs are never reused.
- Shared components (`HeaderPage`, `FooterPage`, `MainHeaderPage`, `BuyModalPage`) stay in `pages/` and are reused by the new
  area, not copied. Before adding a locator or helper search `pages/` for it (a duplicate is a `[dup-pom]` review finding).
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
- No `waitForTimeout`, no `force: true` (close an open filter dropdown with `closeFilter()`, i.e. Escape), no conditionals in a test body. Data-driven variants carry plain data only,
  never functions or branches.
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
- Automation only comments and labels. It never changes a ticket status, never closes or resolves a ticket. A bug that
  was not reproduced becomes `needs-manual-repro`, never "not a bug".
- Repro runs against production without destructive actions (no login, no purchase).
