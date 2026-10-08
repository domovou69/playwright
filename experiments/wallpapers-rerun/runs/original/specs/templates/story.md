# Story and Subtask templates

`/create-story` fills the Story; `/implement-ticket` fills one Subtask per group on its first run. A human-written Story enters the
loop at `/create-story`, which only normalises it into this shape and adds what is missing. Jira descriptions are plain lines,
`## ` headings and `- ` bullets (no tables): that is what `scripts/jira-create.mjs` turns into Jira's document format.

## Story

Summary: `<Area>: <what the suite will cover>` (for example `Ringtones: guest list, search, detail and download coverage`)

```
## Scope
<Two or three lines: which part of the site, which user (guest), what "covered" means.>

## Groups
- <group-1 name>: <scenario IDs, e.g. RT-01, RT-02>: <one line>
- <group-2 name>: ...
(One group = one Subtask = one branch = one PR. Three to four groups, about 4-6 tests each.)

## Reuse map
- Page objects and helpers to reuse: <file: member, ...>
- New page objects needed: <name, which group first needs it>
- Shared components (header, footer, buy modal): <reused as is | needs a change in pages/>

## Constraints
- Guest only, free content only; no login, no purchase, no load, no security probing.
- Production site, no destructive actions; content is live: assert invariants, never a title or an exact count.
- A download test checks that a free item really downloads.
- Conventions: CLAUDE.md (area table, tags, no waitForTimeout, no force, no conditionals, fixtures/test, explicit page objects).

## Acceptance criteria
- Every scenario of the plan that is in a group has a test with its ID in the title and the tags from the plan.
- npm run verify reports stable for every new test; lint, tsc and format:check are clean.
- Every bug found has a ticket (after a human approves it) and a @BUG:<KEY> test.
- Plan coverage (scripts/plan-coverage.mjs) shows no missing scenario of the groups.

## Out of scope
- <what is deliberately not covered and why>

## Links
- Plan: specs/<area>.plan.md
```

Label on the Story: `plan-approved` (set by `/create-story`; it is the state the next command expects).

## Subtask (one group)

Summary: `<Area>: <group name>`

```
## Scenarios
- <ID> <title> [P1|P2|P3] [@tags]

## Files
- Tests: tests/<area>/<file>.spec.ts
- Page objects: pages/<area>/<file>.ts (new or changed)

## Branch
<KEY>-<short-kebab-title> (the key of this Subtask)

## Done when
- The raw commit exists on the branch; the npm run verify report is in the ticket comments; the PR is open for review.
```

State labels on a Subtask, one at a time: `impl-in-progress` -> `impl-ready-for-review` -> `review-addressed`.
