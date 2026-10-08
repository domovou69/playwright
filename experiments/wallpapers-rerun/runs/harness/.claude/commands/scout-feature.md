---
description: Step 1 of the loop. Explore a site area live, write its test plan with verified facts, and stop at the plan gate.
argument-hint: <area> [path, e.g. ringtones /ringtones]
disable-model-invocation: true
model: sonnet
effort: high
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(git status*) Bash(git diff*) Bash(git log*)
---

!`cat .claude/loop-rules.md`

# /scout-feature $ARGUMENTS

**Input:** an area name (and optionally its path on the site). Nothing else: no ticket exists yet.
**Output:** `specs/<area>.plan.md` (scenario IDs `<PREFIX>-XX` from the `## Areas` table in CLAUDE.md), a feature inventory, a reuse
map, a go/no-go. **Gate after:** `gate: plan approved`. You write no test code and touch no Jira ticket.

1. Read CLAUDE.md (`## Areas`), `specs/wallpapers.plan.md` (the reference for the format) and `pages/` (what can be reused).
   If the area is not in the table or its tag is not in `src/utils/tags.ts`, stop and say what to add first.
2. Explore the area live through the Playwright MCP, headless, as a guest: list page, search, filters, detail page, free
   download, premium gate. Use the `playwright-test-planner` agent for the first draft, then check every fact yourself.
3. Write the plan in the same shape as the wallpapers plan, with these rules:
   - Each scenario is a heading `#### N.M. <PREFIX>-XX [P1|P2|P3][<origin>][@smoke|@regression][@download|@BUG:<KEY>] Title`
     (`scripts/plan-coverage.mjs` parses this). P1 is `@smoke`, everything else `@regression`.
   - Each expected result is tagged `[verified-live]` (you saw it on the site in this session, say what you did) or `[assumed]`
     (you did not). Nothing is left unmarked. Bugs you meet become `[bug candidate]` notes, not tickets.
   - `## Reuse map`: existing page objects and helpers per scenario group, and which new page objects are needed.
   - `## Go / no-go`: does a guest see free items; does a free item really download; does a preview play headless. If not, say
     which scenarios to cut and recommend narrowing the scope before a Story is written.
   - Header line `Status: draft`.
4. Run `node scripts/plan-coverage.mjs --plan specs/<area>.plan.md` to check the headings parse (0 implemented is expected).
5. Stop. Show the plan summary (scenario count by priority, go/no-go, `[assumed]` count) and wait. On `gate: plan approved`, change
   the header to `Status: approved <date>` and finish with the `git add` + `git commit` block. On anything else, revise.
