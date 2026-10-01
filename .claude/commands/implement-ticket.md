---
description: Step 3 of the loop. Implement one group of an approved Story as page objects and tests on its own branch.
argument-hint: <Story or Subtask key, e.g. ZED-12>
disable-model-invocation: true
model: sonnet
effort: medium
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(npm run *) Bash(npx *) Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git show*) Bash(git switch*) Bash(git checkout*) Bash(git branch*) Bash(git add*) Bash(git commit*) Bash(git pull*) Bash(git fetch*)
---

!`cat .claude/loop-rules.md`

# /implement-ticket $ARGUMENTS

**Input:** a Story (first run) or a Subtask, through Jira and the plan file. **Output:** Subtasks (first run), a branch, page
objects and tests for one group, a raw commit, a `verify` report in the Subtask. **Gate after:** code review. No push, no PR.

1. **Refuse a ticket that is not In Progress (L-03).** For a Subtask the gate applies to its parent Story:
   `node --env-file-if-exists=.env scripts/jira-ticket.mjs show --issue=$0` to see the type, then
   `... gate --issue=<Story key> --status="In Progress" --label=plan-approved,impl-in-progress,impl-ready-for-review,review-addressed`.
   If the gate is closed, print its message and stop. Do not work around it.
2. **First run on a Story:** read its `## Groups`; for each group that has no Subtask yet, create one
   (`jira-create.mjs --type=Subtask --parent=<Story> --summary="<Area>: <group>" --description-file=...`, template in
   `specs/templates/story.md`). Then take the first group whose Subtask has no `review-addressed` label.
   **Subtask given:** work on that group.
3. Set `impl-in-progress` on the Subtask. Create the branch `<SUBTASK-KEY>-<short-kebab-title>` from an up-to-date `main`.
   Refuse if the working tree is dirty.
4. Read the group's scenarios in `specs/<area>.plan.md` and CLAUDE.md. Invoke the `playwright-best-practices` skill. Generate with
   the `playwright-test-generator` agent, one call per target file; it may edit `pages/`. If it fails, take over yourself and say so.
5. Run `npm run lint`, `npx tsc --noEmit`, `npm run format:check`, then `npm run verify`. Fix what fails (at most 3 attempts per
   problem, then `BUDGET STOP:`). A bug found on the way follows the bug rule above.
6. Run `node scripts/plan-coverage.mjs --plan specs/<area>.plan.md`: no scenario of the group may be missing, no tag mismatch.
7. Make the raw commit on the branch (CLAUDE.md message format plus the `[agent - Claude]` body line). Post a Subtask comment with:
   `Raw commit: <sha>`, the `verify` verdict per test, the plan-coverage result, and what you reused vs added in `pages/`
   (`jira-ticket.mjs comment`). Set `impl-ready-for-review`.
8. Stop. Tell the human the branch name and that the next step is their review; pushing and opening the PR wait for their request.
