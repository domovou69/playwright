## Loop rules (shared by every loop command; the command text below adds its own input, output and gate)

**State lives in Jira and git, never in chat.** Read your input from the ticket, the plan file and the branch. A gate is a human
decision that starts with `gate:` (for example `gate: plan approved`, `gate: file bug`, `gate: extend`); anything else the human
types is an intervention. Never treat silence, a hand-back or your own summary as approval.

**Constraints, always.** Guest only, free content only; no login, no purchase, no load, no security probing. Production site,
no destructive actions. Content is live: assert invariants, never a title or an exact count. Headless browsers only.

**Jira.** Use `node --env-file-if-exists=.env scripts/jira-ticket.mjs` (show, gate, label, comment) and
`scripts/jira-create.mjs`. Every write carries the `[agent - Claude]` marker (the scripts add it). You only comment and set the
one state label; you never change a status, never close or resolve a ticket. A bug that was not reproduced becomes
`needs-manual-repro`, never "not a bug".

**Git.** Follow CLAUDE.md. Commit only on the ticket branch (`<KEY>-<short-kebab-title>`) and only when the command says so; end
every commit message with a body line `[agent - Claude]`. Never push, open a PR or merge unless the human's message in this
session asks for it. Finish with a ready-to-paste `git add` + `git commit` block for anything you did not commit.

**Before writing or editing a test** invoke the `playwright-best-practices` skill. The rules in CLAUDE.md win over the skill.

**Stop rules.** At every phase boundary run `node scripts/session-cost.mjs --current --json` and read `activeMin`. At 60 active
minutes stop. The healer and `/fix-test` get at most 3 attempts per failing test. A test that is still flaky after
`npm run verify` (3 runs) goes to the human. On any stop, your message starts with `BUDGET STOP:` (the metrics count it), then
says what you tried, what you know and what you need. Continue past the limit only after `gate: extend`.

**Bugs found during the work.** Stop. Show a draft (title, steps, evidence) and wait for `gate: file bug`. Then
`scripts/jira-create.mjs --type=Bug`, run triage on it (`ISSUE_KEYS=<KEY> node --env-file-if-exists=.env scripts/jira-triage.mjs`),
reproduce it through the Playwright MCP against production, record the outcome with `scripts/jira-repro.mjs`, and only then
write the test with `@BUG:<KEY>` and the `{ type: 'bug', description }` annotation. A test never asserts buggy behaviour
without a ticket. If triage lists a related ticket, judge by meaning and say so in the repro outcome.

**Review comments** on a PR start with a class: `[oracle]`, `[locator]`, `[convention]`, `[missing]`, `[dup-pom]`, `[flaky]`,
`[other]`. A comment without a class is treated as `[other]` and you say so.
