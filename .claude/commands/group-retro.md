---
description: Step 5 of the loop. After a merge, classify the review findings, turn each class into a rule, and record the group's metrics.
argument-hint: <Subtask key>
disable-model-invocation: true
model: sonnet
effort: high
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(npm run *) Bash(npx *) Bash(git log*) Bash(git diff*) Bash(git show*) Bash(git status*) Bash(gh pr *) Bash(gh api repos/*)
---

!`cat .claude/loop-rules.md`

# /group-retro $ARGUMENTS

**Input:** the Subtask key, its merged PR and its review comments. **Output:** findings by class, each turned into a rule, a lint
check or a command change; a row in `metrics/groups.csv`; new rows in `metrics/sessions.csv`. **Gate after:** the human starts the
next group. You change files but do not commit (the human reviews the diff); end with the commit block.

1. Refuse unless the PR is merged: `gh pr list --head <branch> --state merged --json number,mergeCommit,url`. The raw commit is
   the `Raw commit:` line in the Subtask comments (`jira-ticket.mjs show` and the comments).
2. Measure (PRs are squash-merged, so `--merge` is the branch tip, `gh pr view <n> --json headRefOid`, not the merge commit): `node --env-file-if-exists=.env scripts/loop-metrics.mjs --raw <raw> --merge <branch tip> --pr <n> --ticket <KEY>`.
3. Compare the finding classes with earlier rows of `metrics/groups.csv` (recurrence: a class that an earlier retro turned into
   a rule and that appeared again is a failed rule; say so and strengthen it, ideally as an ESLint check).
4. For each class with findings, produce exactly one of: a line in CLAUDE.md, an ESLint rule or config change, a change in a
   command or agent file. Say which finding it covers. Invoke the `playwright-best-practices` skill if the rule is about tests.
   No finding goes without an output, no output without a finding (L-07).
5. Append the group's row to `metrics/groups.csv` (leave `human_review_min` empty). Append session rows:
   `node scripts/session-cost.mjs --all --skip-known metrics/sessions.csv --skip-newest --csv >> metrics/sessions.csv` (the running
   session is picked up by the next retro), and fill nothing else by hand.
6. Move the Subtask to `Done` (`jira-ticket.mjs transition --issue=<KEY> --to=Done`). If every Subtask of its Story is now `Done`,
   move the Story to `Done` too and comment on it with `--mention`.
7. Run lint, tsc and format check. Stop with the diff summary, the recurrence verdict and the `git add` + `git commit` block.
