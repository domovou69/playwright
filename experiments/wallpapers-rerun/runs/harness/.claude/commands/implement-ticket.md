---
description: Step 3 of the loop. Implement one group of an approved Story as page objects and tests on its own branch.
argument-hint: <Story or Subtask key, e.g. ZED-12>
disable-model-invocation: true
model: sonnet
effort: medium
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(npm run *) Bash(npx *) Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git show*) Bash(git switch*) Bash(git checkout*) Bash(git branch*) Bash(git add*) Bash(git commit*) Bash(git pull*) Bash(git fetch*) Bash(git push*) Bash(gh pr create*) Bash(gh pr view*) Bash(gh pr diff*) Bash(gh pr comment*)
---

!`cat .claude/loop-rules.md`

# /implement-ticket $ARGUMENTS

**Input:** a Story (first run) or a Subtask, through Jira and the plan file. **Output:** Subtasks (first run), a branch, page
objects and tests for one group, a raw commit, a pushed branch and an open PR, a self-review, a `verify` report in the Subtask. **Gate after:** the human's review in the PR (then `/address-review`). No merge.

1. **Refuse a ticket that is not In Progress (L-03).** For a Subtask the gate applies to its parent Story:
   `node --env-file-if-exists=.env scripts/jira-ticket.mjs show --issue=$0` to see the type, then
   `... gate --issue=<Story key> --status="In Progress" --label=plan-approved,impl-in-progress,impl-ready-for-review,review-addressed`.
   If the gate is closed, print its message and stop. Do not work around it.
2. **First run on a Story:** read its `## Groups`; for each group that has no Subtask yet, create one
   (`jira-create.mjs --type=Subtask --parent=<Story> --summary="<Area>: <group>" --description-file=...`, template in
   `specs/templates/story.md`). Then take the first group whose Subtask has no `review-addressed` label.
   **Subtask given:** work on that group.
3. Set `impl-in-progress` on the Subtask, assign the human and move it to `In Progress` (`jira-ticket.mjs assign`, `transition --to="In Progress"`; no mention). Create the branch `<SUBTASK-KEY>-<short-kebab-title>` from an up-to-date `main`.
   Refuse if the working tree is dirty.
4. Read the group's scenarios in `specs/<area>.plan.md` and CLAUDE.md. Invoke the `playwright-best-practices` skill. Generate with
   the `playwright-test-generator` agent, one call per target file; it may edit `pages/`. If it fails, take over yourself and say so.
5. Run `npm run lint`, `npx tsc --noEmit`, `npm run format:check`, then `npm run verify`. Fix what fails (at most 3 attempts per
   problem, then `BUDGET STOP:`). A bug found on the way follows the bug rule above.
6. Run `node scripts/plan-coverage.mjs --plan specs/<area>.plan.md`: no scenario of the group may be missing, no tag mismatch.
7. Make the raw commit on the branch (CLAUDE.md message format plus the `[agent - Claude]` body line). Note its sha: it is the
   `Raw commit:` the metrics start from, and self-review fixes come after it as separate commits.
8. Push the branch and open the PR against `main` (`git push -u origin <branch>`, `gh pr create`): title `<SUBTASK-KEY> <group
summary>`, body with the scenarios of the group, the `verify` verdict per test, the plan-coverage result, what you reused vs
   added in `pages/`, the Jira link, ending with the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
9. Self-review the PR as a reviewer would, from `gh pr diff <n>`: every CLAUDE.md rule (components, shared helpers instead of
   copies, no conditionals or `waitForTimeout`, tags, `[dup-pom]` search in `pages/`), assertions that are not invariants of live
   content, a test that checks less than its plan scenario. For each finding, fix it in its own commit (message + `[agent - Claude]`
   body line), re-run lint, tsc, format check and `verify` for what changed, push. At most 2 rounds. Post one PR comment
   (`gh pr comment`) starting with `[agent - Claude]`: "Self-review: <n> findings fixed in <shas>" or "Self-review: no findings",
   with a line per finding. Do not post classed `[class]` comments yourself: those are the human's and the metrics count them.
10. Post a Subtask comment with `--mention` (`jira-ticket.mjs comment --mention`): `Raw commit: <sha>`, the PR URL, the `verify`
    verdict per test, the plan-coverage result, what you reused vs added, the self-review result. Set `impl-ready-for-review`.
11. Stop. Tell the human the PR URL; the next step is their review in the PR, then `/address-review <KEY>`.
