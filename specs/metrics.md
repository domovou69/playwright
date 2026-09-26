# AI-assisted test automation: metrics

## Baseline (manual, before the AI pipeline)

| Section    | Tests | Test cases (README) | Stability          |
| ---------- | ----- | ------------------- | ------------------ |
| Wallpapers | 4     | TC-01..TC-11        | 4/4 passing on run |

## Pipeline log

| Date             | Stage                               | Tool / agent            | Duration | Output                              | Human review notes |
| ---------------- | ----------------------------------- | ----------------------- | -------- | ----------------------------------- | ------------------ |
| 2026-09-26 21:33 | Seed, fixtures, agent project rules | Claude Code (main)      |          | seed + rules for planner/gen/healer |                    |
| 2026-09-26 21:34 | Test plan: wallpapers               | playwright-test-planner | 8 min    | 32 scenarios (10 covered, 22 new)   | see v2             |
| 2026-09-26 22:25 | Plan review v2 + live fact check    | Human + Claude (MCP)    |          | 23 scenarios, 2 `@bug`              | 9 removed/merged   |

## Result per section

| Section    | Scenarios planned | Tests generated | Accepted after review | Stability (`--repeat-each=5`) | Total time |
| ---------- | ----------------- | --------------- | --------------------- | ----------------------------- | ---------- |
| Wallpapers |                   |                 |                       |                               |            |

## Roadmap

1. Wallpapers: generate P1 (WP-10, WP-18, WP-19, WP-30), move `TODO(pom)` into `pages/`, stabilize, then P2 and P3.
2. Remove the replaced chained filter test and TC-11 from `tests/wallpappers/wallpapers.spec.ts`.
3. Tool comparison: Explorbot vs this pipeline on the same section (below).
4. Ringtones: same pipeline.

## Tool comparison: Tool 1 (this pipeline) vs Tool 2 (Explorbot)

Run Tool 2 after the wallpapers suite is finished with Tool 1, so both results cover the same scope.

### Common scope (identical for both tools)

- Site: zedge.net, section `/wallpapers` (list, search, category navigation, filters, scroll and "Load more", detail
  page, free download, premium purchase gate).
- Guest user only: no sign-in, purchase or upload; flows stop at the sign-in or purchase dialog.
- Desktop viewport only, Chromium.
- Live production site: one session, one action at a time.
- Out of scope: ringtones, security testing (XSS, SQL injection), load and performance testing.

### Toolsets

| Component       | Tool 1: this pipeline                                                                                                                                                       | Tool 2: Explorbot                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestration   | Claude Code 2.1.283 (VS Code extension), main session model: Sonnet 5 until plan v1, Opus 5.5 from plan v2                                                                  | [Explorbot](https://github.com/testomatio/explorbot) (testomat.io, by DavertMik), version at run time                                         |
| Agents          | Playwright 1.63 Test Agents: `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer` (model: Sonnet), browser via the `playwright-test` MCP server | Built-in crew: research, plan, execute, verify                                                                                                |
| Knowledge       | Skills: `playwright-best-practices` (currents-dev @283d5cb, project), `systematic-debugging` (obra/superpowers @8ca22db, global); project rules in `.claude/agents/*.md`    | Built-in prompts; learned "experience" between runs                                                                                           |
| Models          | Claude (Sonnet for agents, Opus/Sonnet for the main session)                                                                                                                | Defaults from its `models.json`: OpenRouter `openai/gpt-oss-20b:nitro` (standard), `openai/gpt-5.6-luna` (vision and agentic)                 |
| Browser engine  | Playwright (Chromium)                                                                                                                                                       | Playwright                                                                                                                                    |
| Project context | Reads existing `pages/*.ts`, `fixtures/test.ts`, seed and tests                                                                                                             | None: works from the live UI only                                                                                                             |
| Human in loop   | Plan review, `[CONFIRM]` decisions, code review of generator and healer output                                                                                              | None by design; human reviews the final report                                                                                                |
| Output          | Test plan (`specs/*.plan.md`), Playwright tests on project POM and fixtures                                                                                                 | Report (HTML or Markdown), videos, standalone Playwright or CodeceptJS tests                                                                  |
| Cost model      | Claude subscription (plan: fill in), no per-token charges                                                                                                                   | Pay per token, API key; stated about $1 per hour of continuous run                                                                            |
| Setup           | This repo                                                                                                                                                                   | Separate folder outside this repo; OpenRouter key with $5 balance; default models; time-boxed to 30 minutes; same constraints as Common scope |

### Compare

| Metric                                   | Tool 1: this pipeline                             | Tool 2: Explorbot |
| ---------------------------------------- | ------------------------------------------------- | ----------------- |
| Scenarios produced                       |                                                   |                   |
| Useful scenarios after human review      |                                                   |                   |
| Found: price-10 premium gate bug (WP-29) | planner saw the difference, human called it a bug |                   |
| Found: `maxPrice=NaN` in URL             | human only                                        |                   |
| Found: DialogTitle a11y error (WP-33)    | planner                                           |                   |
| New findings we missed                   |                                                   |                   |
| False positives                          |                                                   |                   |
| Generated tests that run green as-is     |                                                   |                   |
| Uses project POM and fixtures            | yes                                               |                   |
| Human effort to adapt the output         |                                                   |                   |
| Wall-clock time                          |                                                   |                   |
| Money spent                              | subscription                                      |                   |
