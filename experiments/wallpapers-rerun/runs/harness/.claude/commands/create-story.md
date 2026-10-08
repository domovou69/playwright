---
description: Step 2 of the loop. Turn an approved plan (or a human-written Story) into a Jira Story in the template.
argument-hint: <specs/<area>.plan.md | path to a human-written Story text>
disable-model-invocation: true
model: sonnet
effort: medium
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(git status*) Bash(git diff*) Bash(git log*)
---

!`cat .claude/loop-rules.md`

# /create-story $ARGUMENTS

**Input:** an approved plan file, or (Story entry) a human-written Story text. **Output:** one Story in To Do, in the template of
`specs/templates/story.md`, with the label `plan-approved`. **Gate after:** the human moves the Story to In Progress.
You change no status (L-02).

1. Read the input file. **Plan entry:** refuse unless its header says `Status: approved`. **Story entry:** the file is not a plan;
   keep the author's wording and only add what the template needs and the text lacks (groups, reuse map, constraints,
   acceptance criteria, out of scope). Say what you added.
2. Read `specs/templates/story.md`, `## Areas` in CLAUDE.md and `pages/` for the reuse map.
3. Cut the scenarios into 3-4 groups of about 4-6 tests (a group = one Subtask = one branch = one PR): same page, same new page
   object, P1 first. Every scenario of the plan is in exactly one group or in `## Out of scope` with a reason.
4. Write the description to a scratch file and preview it:
   `node --env-file-if-exists=.env scripts/jira-create.mjs --type=Story --summary="<Area>: ..." --description-file=<file> --state=plan-approved --dry-run`
5. Show the human the Story text and wait for a plain "ok" (this is not a gate, it is a read-through of text you are about to
   publish). Then run the same command without `--dry-run`, and print the key and URL.
6. Stop. The next step is the human moving the Story to In Progress, then `/implement-ticket <KEY>` in a fresh window.
