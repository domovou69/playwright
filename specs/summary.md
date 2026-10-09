# Claude + skills + Playwright MCP: an AI-assisted E2E suite with a QA loop

A short, reader-facing summary. Evidence and numbers: `specs/retrospective.md` (first loop), `specs/metrics.md` and `metrics/` (per-group data),
`experiments/wallpapers-rerun/eval/final.md` (is the harness needed).

## The idea

Try to generate a plan, page objects, tests and the harness around them autonomously, with Claude + skills + the Playwright
MCP as the main tool, and refine the rules and skills wherever the output fell short. The starting point was a small manual
suite (4 tests, written 1.5 years ago). Three areas were built on it: wallpapers (v1, 34 tests, the harness itself), ringtones
(v2, 27 tests) and notification sounds (v3, 27 tests). Generation runs locally, with a human as the reviewer and final validator.

## What is in it

- **Tools.** Playwright with its planner / generator / healer agents. Playwright MCP to look at the live site and check
  facts. Currents.dev for run history and flaky tests (a reporter, a dashboard, and an MCP the AI can query; a paid product with a 14-day trial and no free plan). Jira REST and
  GitHub Actions for ticket intake.
- **Skills and rules.** A vendored Playwright best-practices skill, trimmed from 59 to 40 reference files and an index cut from
  26 KB to 8 KB. It is called explicitly in `CLAUDE.md` and preloaded in the generator and healer. One conventions file plus
  ESLint holds the rules. A global root-cause debugging skill is optional.
- **Plan.** The planner drafts scenarios; a human plus a live check cuts the list. The important ones (P1) become `@smoke`.
- **Bug tests.** A test asserts the current broken behavior, stays green, and carries `@BUG:<TICKET>`. When the site is
  fixed the test fails and comes to review.
- **Ticket loop.** A script triages new bugs (labels, keyword hints, no LLM). Claude reproduces the bug on production. A script
  posts the outcome with evidence and sets one state label. The human gets checked context, not a bare ticket. Automation
  never changes a ticket status.
- **Self-check.** Each new test runs several times and gets a stable / flaky / failing verdict before review.

## What was unnecessary

- A custom dashboard: Currents already covers runs and flaky history.
- A script that checked tag formatting: ESLint with a typed tag list is enough.
- Keyword-only duplicate detection as a decision: it only proposes candidates now.
- A cookie-consent bypass through the vendor API: it looked like a regression and was reverted.
- The Explorbot experiment: free tiers hit limits, one scenario cost 732K tokens, and the output has no page objects.

## Where time was lost

- **CI-only failures** from the cookie banner and ad interstitials: about 160 minutes over five iterations. Run the first tests
  in CI on day one and put consent handling and ad blocking in a fixture.
- **Rules written after the code**, so a separate cleanup pass followed (tags, page-object split, no `force`, no conditionals).
  Write the rules and lint checks first.
- **A test hang mistaken for a timeout problem.** Reading a list of cards one by one hung when the list re-rendered; one
  atomic read fixed it.

## Results

- **A new area on the finished harness is cheap.** Ringtones: about $14 and 56 agent minutes, 6 review comments (all in the first
  group, none repeated after the rule was written). Notification sounds: about $6 and 21 agent minutes, 20 of 20 plan scenarios,
  0 review comments. The v1 figure (about $181, 27 hours) is the cost of building the harness plus experiments, not of the tests.
  Dollars are API-equivalent and a lower bound; about 70% is repeated context reading. Human review time was not recorded.
- **Black-box use on a public site works** under these conditions: rules and lint before the first generation, a human at the plan
  and PR gates, assertions on invariants of live content. Bugs found by the loop and filed: ZED-3, ZED-4, ZED-18, ZED-19.
- **Is the harness needed?** Answered by a controlled rerun of wallpapers, below.
- **Not proven:** that Currents speeds up fixing tests, the decisive use of each tool, and maintenance cost (the site barely
  changes, so it cannot be estimated).

## Is the harness needed? Wallpapers, three cases

The same area (wallpapers) on the same production site, measured the same way:

| Case         | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Original** | The suite built in v1: Sonnet 5, over weeks, with human edits and an earlier version of the rules. Kept from git tag `wallpapers-original`.                                                                                                                                                                                                                                                                                                               |
| **Bare**     | Plain Claude (Sonnet 5.5): the task text, the Playwright MCP, and nothing else.                                                                                                                                                                                                                                                                                                                                                                           |
| **Harness**  | Claude (Sonnet 5.5) driven by the loop: `CLAUDE.md` conventions, the commands `/scout-feature`, `/create-story`, `/implement-ticket`, and the planner, generator and healer agents, the vendored `playwright-best-practices` skill, the shared loop rules (gates, 60-minute budget stop, `verify` three-run check, `plan-coverage`), and the project ESLint rules (tags, no conditionals, component access). Tickets were markdown files instead of Jira. |

Both new runs got the same task text, the same environment layer (cookie-consent handler, ad blocking, config), no Jira, all
gates approved in advance, and no access to the old tests or plan. Not run in the harness arm: `/address-review`,
`/group-retro`, the human PR review, push and PR. Judge: a separate Opus session that saw the three suites as anonymous X, Y, Z
and had to inventory the live site's features before reading any code; the mapping was sealed until after scoring.

| Metric                                | Original | Bare                          | Harness                 |
| ------------------------------------- | -------- | ----------------------------- | ----------------------- |
| Cost, API-equivalent                  | n/a      | $5.6                          | $9.4                    |
| Active minutes                        | n/a      | 170                           | 117                     |
| Human interventions                   | n/a      | 3                             | 1                       |
| Tests                                 | 33       | 68                            | 39                      |
| Stable in 3 of 3 runs                 | 33 of 33 | 63 of 68 (2 flaky, 3 failing) | 39 of 39                |
| Lint violations, universal rules      | 1        | 9                             | 0                       |
| Site features covered (of 21, judge)  | 17       | 19                            | 18                      |
| **Judge total, 0 to 100**             | **33.3** | **66.7**                      | **62.5**                |
| Judge verdict                         | rework   | merge after small fixes       | merge after small fixes |
| Known bugs found (ZED-3, ZED-4)       | 2 of 2   | 0 of 2                        | 0 of 2                  |
| New bugs, confirmed live by the judge | 0        | 3                             | 1                       |
| False positives                       | 0        | 0                             | 0                       |

**Judge total.** Six criteria (coverage, assertions, locators, page objects, test quality, bug reports), each scored 1 to 5, each
mapped to 0 to 100 and averaged with equal weights: `total = (sum of six scores - 6) / 24 * 100`. Raw sums: original 14,
bare 22, harness 21 of 30. Stability, lint and cost are shown beside the total, not mixed into it.

**Bugs** (each reproduced by the judge on production; steps and a relevance column in `experiments/wallpapers-rerun/eval/bugs.md`):

| Case     | Bugs                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Original | ZED-3: premium items priced 10 show "Download" or "Buy" inconsistently. ZED-4: Buy modal logs a missing-description warning.         |
| Bare     | Unknown `sort` value returns HTTP 500. "Newest first" is not in date order. `%` in a search loops a `URIError` and freezes the page. |
| Harness  | `maxPrice=NaN` in the URL when only "From" is set in the price filter (no test written for it).                                      |

**Conclusions**

- The two new runs are close (66.7 and 62.5); with one run per arm the gap is noise. Both are well above the original
  (33.3), but that mixes the process improvements with a newer model.
- The harness bought reliability and structure: all tests stable, no lint violations, real components and tags. It cost about
  1.7 times more and produced a smaller suite (39 tests against 68).
- Plain Claude was cheaper, wider and found more new bugs, but 5 of its 68 tests are unstable or failing, it has no tags, fixed
  sleeps, run-time skips and one 211-line page object.
- Neither new run found the two known bugs; both saw the price-10 symptom and worked around it.
- On this evidence the harness is not what makes a good first draft. Its value is in keeping many areas stable and uniform over
  time, which one area cannot measure. Caveats: one run per arm, a judge from the same model family, a harness built on this
  very site, operator mistakes that cost both arms time, and no count of the human time spent building the harness.

Full tables, caveats and the judge's report: `experiments/wallpapers-rerun/eval/` (`final.md`, `judge-report.md`, `bugs.md`).

## Recommendation

The system can be used on real projects, but it needs tailoring to each project: its own rules, its own ticket flow, its own
environment fixes. Start with the foundation (lint, rules, CI on day one), keep the human as the validator, measure cost and
review time from the first day, and schedule a review after each stage. If the goal is a quick broad first draft, plain Claude
is enough; the harness pays off when tests must stay stable and uniform across many areas. It is a working prototype, not an
autonomous product.
