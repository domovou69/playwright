# Playwright E2E: zedge.net wallpapers

Black-box E2E tests for the guest wallpapers section of [zedge.net](https://www.zedge.net/), plus an agentic QA loop around
them: Jira and Currents on one side, Playwright agents (planner, generator, healer) on the other, a human as the gate.

## Setup

Node >= 24, npm >= 12.

```bash
npm install
npx playwright install chromium
```

Create `.env` (see [Environment](#environment)). Only the tests themselves need nothing: `BASE_URL` defaults to production.

## Commands

| Command                               | What it does                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `npm test`                            | All tests, headless                                                             |
| `npm run test:ui`                     | Playwright UI mode                                                              |
| `npm run test:download`               | Tests tagged `@download`                                                        |
| `npm run verify`                      | Repeats every new or changed spec (default x3), prints stable / flaky / failing |
| `npm run trace <folder or trace.zip>` | Opens a trace from `test-results/`                                              |
| `npm run lint`, `lint:fix`            | ESLint (Playwright rules, typed rules, tag validation)                          |
| `npm run format`, `format:check`      | Prettier                                                                        |
| `npx tsc --noEmit`                    | Type check                                                                      |

## Layout

| Path                                              | Content                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `tests/wallpapers/`                               | Specs; test titles start with the scenario ID (`WP-12 ...`)          |
| `pages/`, `fixtures/`, `src/`                     | Page objects, the `app` fixture (cookie banner, ad blocking), utils  |
| `specs/wallpapers.plan.md`                        | Test plan: scenarios `WP-XX`, verified facts used as the test oracle |
| `specs/agentic-qa-loop.plan.md`                   | The loop: stages, decisions, status                                  |
| `specs/review-followups.plan.md`                  | Current improvement backlog                                          |
| `scripts/`                                        | Jira triage, Jira repro result, `verify`                             |
| `.claude/agents/`, `.claude/skills/`, `.mcp.json` | Playwright agents, vendored best-practices skill, MCP servers        |
| `CLAUDE.md`                                       | Conventions for Claude (git flow, how tests are written and run)     |

Known bugs are kept as green tests that assert the current behavior, tagged `@BUG:<JIRA-KEY>`; a fix makes them fail and
they get reviewed.

## The loop

1. **Analytics.** CI reports every run to Currents (flaky detection, history); agents read it through the Currents MCP.
2. **Triage.** `Jira Triage` workflow (manual): new bugs get a `needs-repro` label and a comment, possible duplicates are
   flagged. A plain script, no LLM.
3. **Repro.** Claude reproduces the bug against production through the Playwright MCP, then records the outcome with
   `scripts/jira-repro.mjs` (comment, evidence, label).
4. **Test and fix.** Planner, generator and healer agents write the regression test (tagged `@BUG:<KEY>`) and the fix on a
   branch; a human reviews the PR and merges.
5. **Self-check.** `npm run verify` before review; flaky tests get the `flaky-unconfirmed` label on their ticket.

Automation only comments and labels. It never changes ticket status and never closes anything.

## Jira scripts

```bash
# triage: specific tickets, or leave ISSUE_KEYS empty to scan candidates
ISSUE_KEYS="ZED-1,ZED-2" node --env-file=.env scripts/jira-triage.mjs

# record a repro attempt
node --env-file=.env scripts/jira-repro.mjs --issue=ZED-3 --outcome=reproduced \
  --steps="1. Open /wallpapers ..." --notes="..." --evidence=test-results/shot.png
```

`--outcome` is `reproduced`, `not-reproduced` or `inconclusive`. In CI, run the `Jira Triage` workflow from the Actions tab.

## MCP servers

Configured in `.mcp.json`: `playwright-test` (headless browser and test tools for the agents) and `currents` (test analytics).
The Currents server is pinned in `devDependencies` (`@currents/mcp`), runs from `node_modules` after `npm install` and reads
`CURRENTS_API_KEY` from `.env`.

## Environment

| Variable                                        | Used by                 | Notes                                      |
| ----------------------------------------------- | ----------------------- | ------------------------------------------ |
| `BASE_URL`                                      | tests                   | Optional, default `https://www.zedge.net/` |
| `CURRENTS_RECORD_KEY`                           | Currents reporter       | Secret in CI                               |
| `CURRENTS_API_KEY`                              | Currents MCP            | Different from the record key              |
| `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | triage, repro, `verify` | `JIRA_API_TOKEN` is a secret in CI         |
| `JIRA_PROJECT`                                  | triage                  | Project key, `ZED`                         |
| `ISSUE_KEYS`                                    | triage                  | Optional, comma-separated                  |
