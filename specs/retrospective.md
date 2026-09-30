# Retrospective and playbook: an AI-assisted E2E suite with a QA loop

Source data: `specs/metrics.md` (per-step durations), `specs/agentic-qa-loop.plan.md`, `specs/explorbot-experiment.plan.md`
and the git history (2026-09-26 to 2026-09-30). Times are wall-clock from the log and commit timestamps, not focused effort.
Token and money cost of the Claude sessions was not measured at the time; it was reconstructed afterwards from the session
transcripts (section 8).

## 1. Goal

The original idea: try to generate a plan, page objects, tests and a harness autonomously, with Claude + skills + the
Playwright MCP as the main tool and rules/skills refined wherever the output fell short. The questions were what it
generates (tests, page objects, architecture) and what it costs in effort, for a black-box E2E suite with no documentation.

The goal grew into a system that helps a project grow, not a pile of tests:

- a correct architecture for E2E tests (page objects, fixtures, tags) that new tests build on;
- bug findings kept as tests tied to tickets, so the suite tells when a bug disappears;
- a harness around it: check a new ticket against production, mark it as a real bug, a duplicate or unclear, and hand it to a
  human with evidence attached instead of a bare ticket;
- self-checks before a human reviews anything.

Starting point: a small manual suite from March 2025 (4 tests, `TC-01..TC-11` in the README, some locators already stale).

## 2. What was built

| Area          | Result                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tests         | 34 (33 real + seed), scenario IDs `WP-XX` from a reviewed plan, `@smoke` (13) on every PR, everything on push to main              |
| Architecture  | Fixtures (`app`, ad blocking, cookie handler), page objects split by component (`FiltersBar`, `FilterDrawer`, `DownloadFlow`)      |
| Rules         | `CLAUDE.md` conventions, ESLint (tags, no `force`, no `waitForTimeout`, no conditionals), a vendored best-practices skill          |
| Agents        | planner, generator, healer with the skill preloaded; Playwright MCP for live exploration                                           |
| Bug tests     | Tests assert the current buggy behavior, stay green, carry `@BUG:<KEY>`; when the site is fixed they fail and are reviewed         |
| Ticket loop   | Triage (plain script, keyword hints, no LLM), repro (Claude + MCP, then a script posts outcome + evidence), one state label a time |
| Self-check    | `npm run verify`: each test repeated, stable / flaky / failing verdict; a flaky `@BUG` test labels its ticket                      |
| Observability | Currents.dev (runs, flaky history) instead of a custom dashboard                                                                   |

Everything AI-driven runs **locally with a human in the loop**. Only triage and CI run without one.

## 3. Timeline and effort (from the log)

| Phase                                | When (commits)             | What happened                                                                                                             |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 0. Baseline hygiene                  | 09-26, about 2.5 h         | Stale locators fixed, ESLint, Prettier, husky, CI, strict tsconfig, agents installed, skill vendored                      |
| 1. Plan                              | 09-26 evening              | Planner: 8 min, 32 scenarios; human + MCP fact check cut it to 23 (9 removed or merged, 2 bugs)                           |
| 2. Generate + POM                    | 09-26 night to 09-27 17:23 | 31 tests generated in batches; each batch followed by a POM pass and a run                                                |
| 3. CI environment                    | 09-27 17:40 to 19:14       | Cookie banner and ad interstitials failing only in CI: five iterations, about 160 min logged                              |
| 4. Explorbot experiment              | 09-27 to 09-28             | Side experiment, see section 5                                                                                            |
| 5. Analytics and ticket loop         | 09-28 17:04 to 09-29 20:16 | Currents wired in, triage, repro finalizer, ticket-driven tests (WP-35), `verify`                                         |
| 6. Cleanup pass driven by the review | 09-29 21:50 to 09-30 00:42 | Tag taxonomy, POM split (one 701-line file became four), no `force`, no conditionals, label state machine, hang fix in CI |

Generation numbers (`specs/metrics.md`):

| Batch                                      | Duration | POM state                                                |
| ------------------------------------------ | -------- | -------------------------------------------------------- |
| Plan (32 scenarios)                        | 8 min    | -                                                        |
| WP-10 (nav), 2 `TODO(pom)`                 | 4 min    | POM missing pieces                                       |
| WP-19 (6 data-driven rows), no `TODO(pom)` | 5 min    | Existing POM was enough                                  |
| WP-18 (reset all), no `TODO(pom)`          | 4 min    | Existing POM was enough                                  |
| WP-30 (purchase gate), 7 `TODO(pom)`       | 5 min    | New page object needed, then a 15 min POM pass (9 moved) |
| WP-01 (list page) + POM pass               | 20 min   | New locators                                             |
| WP-20/21/34 (first batched call)           | 30 min   | Reused POM, 2 real races found and fixed                 |
| WP-11 + WP-23 (two files in one call)      | 35 min   | First run 3/16 failed (2 POM bugs)                       |
| WP-24/26/27 (new detail page) + WP-29      | 55 min   | Genuinely new locators                                   |

Trend: the generator step itself stays at roughly 4-5 minutes per group. Total time depends on **how many new locators
the batch needs**, not on how many tests it adds. With a POM that already covers the page the batch has no `TODO(pom)`
and needs no extra pass; a batch on a new page costs a separate POM pass and often 3-10x more. The biggest single cost was
not generation but the CI environment (phase 3).

## 4. Pitfalls and how to avoid them

| Pitfall                                                                                                                             | Cost                                                       | How to avoid                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Conventions written after the code: plain-data test cases, `expect*` naming, headless, no destructuring `app`, no `force`, tags     | A dedicated cleanup pass (6)                               | Write the rules and ESLint enforcement **before** the first generation; every human correction becomes a rule the same day  |
| One page object grew into 700 lines                                                                                                 | Refactor after 34 tests                                    | Split by UI component from the start, add a size rule; have the generator extend a component, not the list page             |
| Environment problems appear only in CI (consent banner, third-party ad interstitials, slow runner)                                  | ~160 min, five iterations                                  | Run the first 2-3 tests in CI on day one; put the consent handler and ad blocking in the fixture before generating anything |
| A fix judged by one CI run: the consent bypass looked like a regression cause, then the same failure came back on the reverted code | An extra revert cycle                                      | Do not accept a cause from one commit-to-failure correlation; reproduce the mechanism first                                 |
| Single-run policy ("a failure is a bug") and no repeat runs until late                                                              | First `--repeat-each=5`: 15/50 failed, from 2 old POM bugs | Repeat verification from the first generated test (`verify` was built on day 4)                                             |
| Tests hung 90 s instead of failing after 10 s (per-card waits on a list that re-rendered)                                           | Flaky CI, wrong timeout theory                             | Read collections atomically (`evaluateAll`); a timeout increase is not a fix                                                |
| Keyword-only duplicate search flagged unrelated tickets                                                                             | Two reworks of the scoring                                 | Keyword search only proposes candidates; a person or an LLM judges by meaning; only that decision sets a label              |
| Labels only added, never removed                                                                                                    | Contradicting labels on tickets                            | Define labels as one state at a time from the start; never touch labels people added                                        |
| Stale locators and a typo in the tag list (`@regresion`) from the old base                                                          | Silent wrong filtering                                     | Audit the baseline first; type the tag list and lint it                                                                     |
| Conditional logic and `force: true` in generated code                                                                               | 14 + 11 lint warnings                                      | Turn those rules on as errors before generating, so the agent gets the feedback itself                                      |

## 5. Explorbot experiment (autonomous generation) - a failed comparison for this project

Goal: check whether an autonomous exploratory agent could replace the "Claude + skills + MCP" flow.

- **Free Groq tier was not usable.** The only compatible model hit its 8000 tokens-per-minute cap on the first research call
  (the list page needs about 17.9k tokens of context).
- **Gemini free tier worked, but slowly and narrowly.** First plan: 50 s, about 56K + 6K tokens, 4 scenarios. Seven `plan`
  calls produced 22 scenarios, but only because I supplied focus hints taken from what I already knew; zero-hint discovery
  was never tested.
- **Cost per scenario was high.** One executed scenario: 732K tokens (450K cached), 3 min 15 s, 5 full re-research cycles
  (every wallpaper URL has a unique ID, so its per-URL cache never helps), 3 quota errors, 2 wrong guesses before finding a
  premium wallpaper.
- **No structure came out.** The tool has no page object concept: one flat spec per scenario with locators inline as
  role + text. The `framework: 'playwright'` option changes syntax, not structure. The one finished test file did not
  persist after the run hit rate limits.
- **Verification only at the end of the flow.** All steps run first, then a single check on the final screenshot, so a
  mid-flow regression can pass.
- **One real positive.** It independently found the same console accessibility warning I had documented (`WP-33`), which
  shows exploration value.

Conclusion for this project: for a maintainable suite with a page-object architecture, a directed Claude + skills + MCP
session produced a better artifact per token. Explorbot fits a different role (a long-running exploratory companion next to
an existing suite). The Claude side was not token-measured, so the comparison is on structure and reliability, not on dollars.

## 6. Playbook for another project

**Goal statement (use as written):** build an E2E suite and a QA harness where an AI agent does the drafting and a human
reviews with evidence in hand. Success is measured by: a reusable architecture, bugs kept as ticket-linked tests, stable
CI, and a new ticket reaching a human already checked against production.

| Phase                        | Objective                                        | Tasks                                                                                                                                                                   | Exit criteria                                                          | Observed effort (this project)               |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| 0. Foundation                | The agent gets fast, strict feedback             | Audit the baseline; ESLint with the Playwright plugin (tags, no `force`, no waits, no conditionals) as errors; typed tag list; strict tsconfig; formatter; pre-commit   | Lint, types, format clean; old tests pass                              | ~2.5 h (done partly in phase 6)              |
| 1. Rules and skill           | Encode conventions before generating             | `CLAUDE.md` (imports, POM layout, tags, headless, commits); vendor a best-practices skill and preload it in generator and healer; global skills are optional            | An agent asked to write one test follows the rules without reminders   | A few hours; done late here                  |
| 2. CI early                  | Find environment problems on day one             | Run the seed + 2-3 tests in CI; ad blocking and consent handling in a fixture; test timeout and retries decided with data                                               | CI green three times in a row                                          | ~160 min when done late                      |
| 3. Plan                      | A reviewed scenario list with IDs and priorities | Planner drafts; a human plus live MCP fact-check cuts and corrects it; P1 becomes `@smoke`                                                                              | Scenario IDs, expected results and known bugs written down             | 8 min draft + review                         |
| 4. Generate in batches       | Tests and a component-based POM                  | One generator call per target file; POM pass after each batch; verify each batch several times                                                                          | Every test stable 3/3; no `TODO(pom)` left                             | 4-55 min per batch                           |
| 5. Bug tests                 | The suite reports when a bug disappears          | Reproduce a ticket through MCP; write a test that asserts the current behavior; tag `@BUG:<KEY>` + annotation                                                           | Bug test green now, fails when the site is fixed                       | Per ticket                                   |
| 6. Ticket loop               | A human gets checked context, not a bare ticket  | Triage script (labels, comments, keyword hints); repro by the agent; outcome script posts evidence; one state label at a time; automation never changes status          | A new ticket ends with a state label, a marked comment and attachments | ~1 day here                                  |
| 7. Observability and cleanup | Trends and debt visible                          | Reporter to a hosted dashboard (Currents); `verify` in the review flow; regular lint-warning and locator-quality passes                                                 | Flaky tests and slow tests visible, warnings at zero or listed         | Ongoing                                      |
| 8. Review checkpoints        | Debt and drift found on schedule                 | After each stage and once after the loop works: a whole-project review (structure, docs, rules, lint, naming) turned into a tracked follow-up plan, one commit per step | A follow-up plan with checked steps and a progress log                 | ~1 evening here (`review-followups.plan.md`) |

Rules of thumb that held throughout:

- Give the agent structure to extend (components, helpers), not a blank page.
- Keep the human as the last validator and record every correction as a rule or a lint check.
- Automation only comments and labels; anything that changes a ticket status stays with a person.
- An LLM belongs where meaning is judged (duplicates, repro reading); deterministic steps stay plain scripts.
- Schedule a review after each stage and after the loop works; here the review after the loop produced the biggest cleanup
  (tags, POM split, no `force`, labels), so plan it instead of treating it as optional.
- Measure from the first day: time per batch, number of new locators, number of human corrections, tokens.

## 7. What was missed and what is still open

- **Cost was not measured while working.** Section 8 reconstructs session totals from the transcripts, but there is still no
  split per phase or task, no subscription view, and no baseline of how long the same 34 tests would take by hand. Without
  the baseline the "effort" answer is only relative (batches against each other, Explorbot against nothing).
- **Human review time is not logged**, only agent-side duration.
- **Generator quality was not evaluated across runs.** Each batch was reviewed, but there is no repeated-run or
  prompt-variation check of how consistent the generator is.
- **False-positive rate of the repro step** is unknown (three real tickets were verified by hand).
- **Maintenance cost over time** is unmeasured: the site changes, and the live catalog makes data (`first free card`)
  unstable; one assertion had to be dropped for that reason.
- **Unattended AI runs** (in CI) were not attempted; they need an API key, secrets, an MCP browser and write access to Jira.
- **Reporting after the Currents trial:** no free plan exists; a separate experiment with self-hosted ReportPortal is planned
  (see the loop plan, Stage 1).
- **Duplicate check** stays keyword-based; an LLM judgment inside triage is postponed.
- **Open code items:** three `waitForTimeout` warnings, agent-written selectors like `div[class*="card-footer"]`,
  only the guest wallpapers section covered, the flaky-label branch not exercised on a truly flaky test.

## 8. Cost of the Claude sessions (reconstructed afterwards)

Source: `scripts/session-cost.mjs` over the five session transcripts of the project (subagents included), priced from
`metrics/prices.json` (official Anthropic pricing page, fetched 2026-10-01). Dollars are **API-equivalent**, what the same tokens
would cost through the API, not what was paid on the subscription.

**Status: validated on one session, a lower bound elsewhere.** For `ddf88944` (one model, no subagents) the script matches the
`/cost` screen exactly on all four Sonnet token classes and on $12.20; only Haiku side calls ($0.03) are missing. Sessions with
subagents are compared against Claude Code's own recorded totals (below) and are a lower bound by 2-5%.

| Session    | Work                                                             | Started (UTC), span | Models (messages)                                      | Input | Cache-create (M) | Cache-read (M) | Output |       API $ | Active min | Human msgs | MCP calls / result tokens (est) |
| ---------- | ---------------------------------------------------------------- | ------------------- | ------------------------------------------------------ | ----: | ---------------: | -------------: | -----: | ----------: | ---------: | ---------: | ------------------------------- |
| `29338810` | Baseline hygiene (phase 0)                                       | 09-26, 5.5 h span   | sonnet-5 253                                           |   506 |             0.38 |          51.54 |   178k |      $13.60 |        147 |         40 | -                               |
| `821a3a08` | Skills, planner, plan review (phases 0-1)                        | 09-26, 4.1 h span   | sonnet-5 124, opus-5-5 58                              |   366 |             0.84 |          30.39 |   105k |      $11.93 |         81 |         16 | 54 / 65k                        |
| `27bc4505` | Generate + POM, CI environment (phases 2-3)                      | 09-26, 20.5 h span  | opus-5-5 12, sonnet-5 982                              | 1,988 |             3.02 |         194.89 |   441k |      $53.37 |        336 |         51 | 356 / 535k                      |
| `ddf88944` | Explorbot experiment (phase 4)                                   | 09-27, 14.3 h span  | sonnet-5 186                                           |   372 |             0.59 |          41.58 |   151k |      $12.20 |        176 |         40 | 19 / 35k                        |
| `adf577b2` | Analytics, ticket loop, cleanup (phases 5-6), v2 plan at the end | 09-28, 58.6 h span  | sonnet-5 780, sonnet-5-5 393, opus-5-5 8, haiku-4-5 20 | 2,532 |             3.74 |         270.23 |   795k |      $76.73 |        754 |        244 | 135 / 183k                      |
| **Total**  |                                                                  |                     |                                                        | 5,764 |             8.57 |         588.64 | 1,669k | **$167.83** |       1495 |        391 |                                 |

How to read it:

- **This is the sum of the harness and the tests, it cannot be split by task.** A session spans several phases, holds
  compactions and side questions. `ddf88944` is the Explorbot side experiment ($12.20 of the total). The last 40 active
  minutes of `adf577b2` (from `/model opus`, 2026-09-30 19:47 UTC) are the planning of v2 (the plan itself on Opus, then follow-up
  edits): $2.27, inside the total.
- Five sessions exist in the project; the order of magnitude is the point: about $170 API-equivalent, about 25 active hours,
  for 33 tests, the harness, the triage scripts and the experiments around them. Nothing here is a per-test cost.
- By token class the money goes to re-reading context: cache-read 70%, cache-write 19%, output 10%, uncached input under 1%.
- Output and dollars are a **lower bound** (see the check below). "Human msgs" are all free-form messages including the first one;
  v1 had no `gate:` convention, so gates and interventions are not separated.
- MCP result tokens are estimated as characters / 4 (no offline tokenizer), which undercounts on the newer tokenizer by up to
  about 30%. Only `playwright-test` and `currents` were used.

Check against Claude Code's own recorded totals (`cost-state` entries in the transcript), same time window on both sides:

| Session                    | Script | Claude Code | Gap   | Explained by                                                                                                                                                                     |
| -------------------------- | ------ | ----------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ddf88944`                 | $12.20 | $12.22      | $0.03 | Haiku side calls (titles): not in transcripts. No subagents; every token class matches exactly                                                                                   |
| `27bc4505`                 | $53.37 | $55.00      | $1.63 | Extra Sonnet output (+161k tokens, $1.61), most likely the 10 generator subagents; +2,163 input and +56k cache-read (under $0.02) unexplained. Opus main session matches exactly |
| `821a3a08`, 18:15+         | $7.92  | $8.32       | $0.40 | Planner subagent output $0.35 + Haiku $0.05; input and cache classes match exactly                                                                                               |
| `adf577b2`, to 09-29 19:11 | $65.75 | $67.26      | $1.51 | Extra Sonnet output (+88k tokens, $0.88) consistent with subagents, Haiku $0.28, cache-read and input about $0.3 (0.4%) unexplained                                              |

- In a subagent transcript `output_tokens` is a partial snapshot: the planner's 40 messages record 2,103 output tokens, while
  Claude Code counted 36,722 for that model in the same window and the content alone is about 9.6k tokens. Main-session
  output matches exactly. The script therefore says "lower bound" whenever subagents ran, and does not adjust the figure. Exact only for the
  planner case; for the other sessions "subagent output" is the explanation consistent with the numbers, not shown message by message.
- Haiku calls (session titles, WebFetch summaries) never appear in transcripts.
- Claude Code's own counter restarts when a session is resumed (`821a3a08`: 18:15 UTC, the file starts at 15:38) and is saved
  only at some moments (`adf577b2`: last save 09-29 19:11, the file runs to 09-30 21:19), so the comparison uses that window;
  the full-session figures in the table cover more than the counter does.
- `29338810` has no `cost-state` entry, so it has no cross-check at all.
