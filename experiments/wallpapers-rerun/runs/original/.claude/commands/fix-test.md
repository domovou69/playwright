---
description: Task M of the loop. Name the root cause of a flaky or failing test before changing code, then fix it on a ticket branch.
argument-hint: <test title or ID, or path:line> [ticket key]
disable-model-invocation: true
model: sonnet
effort: high
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(npm run *) Bash(npx *) Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git show*) Bash(git switch*) Bash(git checkout*) Bash(git branch*) Bash(git add*) Bash(git commit*) Bash(git pull*) Bash(git fetch*)
---

!`cat .claude/loop-rules.md`

# /fix-test $ARGUMENTS

**Input:** a flaky or failing test. **Output:** a named root cause class first, then a fix on a `ZED-N` branch, a raw commit, a row in
`metrics/fixes.csv`. **Gate after:** code review.

1. Ticket: use the key in the arguments. Without one, stop and ask for it (or for `gate: create task`, then
   `jira-create.mjs --type=Task --summary="Fix flaky <test>"`). Branch `<KEY>-fix-<short-title>` from an up-to-date `main`.
2. Reproduce before anything else: `npx playwright test -g "<title>" --repeat-each=10` (headless). Note how many fail.
3. Find the root cause. If the `systematic-debugging` skill is available, invoke it. Use every evidence source you actually have:
   traces in `test-results/`, the Playwright MCP, and the Currents MCP tools if they are connected in this session (flaky history,
   error signatures, test evidence). If they are not connected, do not ask for them; note "Currents: not available" and go on.
4. **Name the class before you edit any file (L-12):** one of `race`, `locator`, `oracle`, `data`, `environment`, `site-change`,
   `isolation`, `other`, with one line of evidence. Write it in chat and in a comment on the ticket.
5. Fix the cause, not the symptom: no `waitForTimeout`, no bigger timeout as a fix, no `force`. At most 3 attempts, then `BUDGET STOP:`.
6. Verify: `npm run verify` stable; lint, tsc, format check clean. Raw commit (CLAUDE.md format + `[agent - Claude]` body line),
   label `impl-ready-for-review` on the ticket.
7. Append a row to `metrics/fixes.csv`: date, test id, ticket, class, root_cause_found (yes/no), attempts, minutes (leave empty: it
   comes from the session row), currents_data_used (yes/no), systematic_debugging_used (yes/no). Stop at code review.
