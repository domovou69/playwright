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
