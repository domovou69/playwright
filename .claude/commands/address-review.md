---
description: Step 4 of the loop. Answer every classified review comment on the group's PR with a fix or a reason.
argument-hint: <Subtask key> [push]
disable-model-invocation: true
model: sonnet
effort: medium
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(npm run *) Bash(npx *) Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git show*) Bash(git switch*) Bash(git checkout*) Bash(git branch*) Bash(git add*) Bash(git commit*) Bash(git pull*) Bash(git fetch*) Bash(gh pr *) Bash(gh api repos/*)
---

!`cat .claude/loop-rules.md`

# /address-review $ARGUMENTS

**Input:** the Subtask key; its branch and PR. **Output:** fix commits, one reply per comment, `verify` again.
**Gate after:** merge (the human's). Push and replies happen only if the arguments contain the word `push`.

1. Check the state: `jira-ticket.mjs gate --issue=$0 --label=impl-ready-for-review,review-addressed`. Find the PR:
   `gh pr list --head <branch> --state open --json number,url`. No PR or no review comments: stop and say so.
2. Read the comments (`gh api repos/:owner/:repo/pulls/<n>/comments`, plus review bodies). List them with their class. A comment
   without a class is `[other]`; say so in the reply.
3. For each comment decide: fix it, or reply with a reason why not (`[oracle]` and `[missing]` need a live check through the
   Playwright MCP before you agree or disagree). Invoke the `playwright-best-practices` skill before editing a test.
4. One fix commit per class of change (CLAUDE.md format + `[agent - Claude]` body line). Do not touch lines a human committed unless
   the comment asks for it.
5. Run lint, tsc, format check and `npm run verify` again; a flaky test stops here (`BUDGET STOP:`).
6. Draft one reply per comment, each starting with `[agent - Claude]` and naming the fix commit or the reason. If the arguments
   contain `push`: `git push`, then post the replies (`gh api -X POST repos/:owner/:repo/pulls/<n>/comments/<id>/replies`).
   Otherwise print the replies and the `git push` command and stop.
7. When every comment has a reply and verify is stable, set `review-addressed` on the Subtask and comment the summary (fix commits,
   per-class counts). Stop: the merge is the human's.
