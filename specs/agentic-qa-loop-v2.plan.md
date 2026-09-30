# Agentic QA Loop v2: a reusable agent loop, measured

`specs/agentic-qa-loop.plan.md` (stages 1-5) is the record of the first iteration and is not rewritten; `specs/retrospective.md`
is its evaluation. This plan is the working plan from now on.

## Purpose

The product of this plan is **a system**, not a test suite: AI agents that take a QA task from intake to merged, stable tests,
with a human only at the gates, and numbers for what it costs and what each tool adds. The tests are the evidence that the
system works. Success means the loop passes its own acceptance criteria (`## Loop acceptance criteria`) and can be reused on
another project by analogy.

Two ways into the loop, the same loop after that:

- **Discovery entry** (black box, like this project): an agent explores a site area and drafts the Story.
- **Story entry** (a normal project): a human writes the Story or Task; the loop starts from it.

## Iterations

| Iteration | Scope                             | What it gives                                                                                             |
| --------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| v1        | Wallpapers (done)                 | Totals only: tokens and active time from the four existing session transcripts. Not comparable per task   |
| v2        | Ringtones, 3-4 groups (~15 tests) | The loop built and run once, every task measured; plus one small Story entry run on a human-written Story |
| v3        | Ringtones again, from scratch     | Same scope, improved harness, isolated from v2's output: v2 vs v3 shows whether the harness got better    |

No manual-writing baseline: the comparison is the same scope under different harness versions (v2 vs v3).

## Hypotheses and decision

- **H1 (the loop runs itself between gates).** Each group needs at most 2 interventions outside the gates.
- **H2 (the loop learns).** A review-finding class fixed by the group retro does not recur in the next group; v3 has fewer
  findings and interventions than v2.
- **H3 (it is reproducible).** v3 on the same scope reaches the same or better coverage, finds the bugs v2 found, and the
  Story entry works without changes to the commands.
- **H4 (each tool pays).** Every tool (Playwright MCP, Currents dashboard and MCP, the skill) has at least one decisive use
  per iteration, at a context cost we record.

Decision after v3: reuse the loop on other projects as is / with named changes / not worth it. Written in the report with the
numbers behind it.

## Fixed conditions

- Model and effort are fixed in git, not chosen in the editor that day: see `## Model and effort`. Opus was used only to
  write this plan.
- The site has not changed for about 1.5 years, so v2 and v3 run against the same product. The run date is recorded anyway.
- Currents trial until 2026-11-11. v3 is expected to fit before it; if not, deal with it then (extension or ReportPortal).
- Constraints for every agent task, in the Story template and in every command: guest only, free content only, no load,
  no security probing, no login, no purchase, production without destructive actions; a download test checks that a free
  item really downloads.

## Model and effort

Pinned in the frontmatter of each command, agent and skill, so v2 and v3 run with the same settings and the setting lives in
git. Documented behaviour (Claude Code docs, checked 2026-10-01): `effort` in frontmatter overrides the session level while that
command or subagent is active; `CLAUDE_CODE_EFFORT_LEVEL` (env var) beats everything, including frontmatter, so it must not be
set anywhere (not set now in `~/.zshrc`, `~/.zprofile`, `~/.zshenv`, user or project settings). The `model` field of a command
applies for the current turn only.

| Unit                              | Model  | Effort | Why                                                                         |
| --------------------------------- | ------ | ------ | --------------------------------------------------------------------------- |
| `/scout-feature`                  | sonnet | high   | judgement on what matters; the plan is the test oracle                      |
| `/create-story`                   | sonnet | medium | restructures an approved plan into a template                               |
| `/implement-ticket`               | sonnet | medium | clear spec, checked by `verify`, lint, tsc                                  |
| `/address-review`                 | sonnet | medium | concrete comments with classes                                              |
| `/group-retro`                    | sonnet | high   | classification and generalisation into rules                                |
| `/fix-test` (Task M)              | sonnet | high   | root cause before any fix                                                   |
| agent `playwright-test-planner`   | sonnet | high   | set now                                                                     |
| agent `playwright-test-generator` | sonnet | medium | set now                                                                     |
| agent `playwright-test-healer`    | sonnet | high   | set now                                                                     |
| skill `playwright-best-practices` | -      | -      | a reference skill, no `effort`: it would override the session whenever used |

Planning sessions like the one that wrote this plan are run on Opus by hand and are not part of the pilot metrics.
The values are a starting point; changing one is a recorded decision (what, why, which iteration), never a tweak between v2 and v3
without a note. Whether medium is enough for the medium units is a result of the pilot.

Open risk: it is not documented whether a command's `effort` holds for the human's follow-up messages in the same session or
only for the turn the command ran. The user's global setting is `effortLevel: high` with per-model overrides, so the session
baseline is not medium. Checked in the dry run (Stage 7) from the `effort` / `perTurnEffort` fields of the transcript; if it
does not hold, the session is started with `/effort <level>` as well and `sessions.csv` records the effort actually seen.

## Definitions

- **Task / session.** One command in one fresh Claude Code window. A session ends at a gate, so the next step is a new session;
  one session = one row of metrics.
- **Gate.** A human decision the loop waits for: plan approved, Story approved (status moved to In Progress), bug approved
  for filing, budget extension, PR merged. In chat a gate decision starts with `gate:`, so the metrics script can tell it
  from an intervention.
- **Intervention.** Any other human message in a session after the start command: a correction, a decision the agent should
  have made, code written by hand. Changes during code review are not interventions, they are `human_edits`.
- **Budget stop.** The agent hit a stop rule and asked. It is counted separately; what the human does next is either a gate
  (`gate: extend`) or an intervention.
- **Accepted test.** Written, passed `npm run verify`, merged, and passed in CI after the merge. A flake that appears later is
  maintenance (Task M), not part of the writing cost.
- **Group.** A slice of the area (list, search, detail, download, ...) = one Subtask = one branch = one PR.

## The loop

State lives in Jira and git, never in chat: each session reads its input from them.

**Jira.** One Story per area; one Subtask per group, created after the Story is approved. State labels, one at a time, set by
the agent through the same `setStateLabel` mechanism as bugs: `plan-draft` -> `plan-approved` -> `impl-in-progress` ->
`impl-ready-for-review` -> `review-addressed`. Statuses are moved only by the human. Nothing is triggered by a status change:
the human runs the next command, and the command refuses to start when the ticket is not in the expected state (the gate is
enforced by the command, not by trust).

**Branches.** Every branch starts with the ticket key, then a short kebab-case form of the title: `ZED-12-ringtones-search`.
The agent may commit on its ticket branch; it pushes and opens a PR only when asked; the human merges.

| Step | Command                   | Input                        | Output                                                                                             | Gate after           |
| ---- | ------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| 1    | `/scout-feature <area>`   | area name                    | feature inventory, reuse map, `specs/<area>.plan.md` (scenarios `RT-XX`, verified facts), go/no-go | plan approved        |
| 2    | `/create-story <plan>`    | approved plan                | Story in To Do (scope, groups, reuse map, constraints, acceptance criteria), label `plan-approved` | Story -> In Progress |
| 3    | `/implement-ticket <KEY>` | Story or Subtask in progress | Subtasks (first run), branch, POM + tests for one group, raw commit, `verify` report               | code review          |
| 4    | `/address-review <KEY>`   | PR review comments           | fix commits, one reply per comment, `verify` again                                                 | merge                |
| 5    | `/group-retro <KEY>`      | merged PR, its comments      | findings by class, each turned into a rule, lint check or command change; recurrence check         | next group           |
| M    | `/fix-test <test>`        | flaky or failing test        | root cause and class, fix on a `ZED-N` branch (healer, Currents data, systematic debugging)        | code review          |

Story entry = start at step 2 with a human-written Story (step 2 then only normalises it into the template).

**Review comments** go on the GitHub PR, each prefixed with its class: `[oracle]` (wrong expected behaviour), `[locator]`,
`[convention]`, `[missing]` (scenario or check missing), `[dup-pom]` (duplicate locator or helper), `[flaky]`, `[other]`.
`/address-review` and `/group-retro` read them through `gh`, so the findings are data.

**Bugs found during the work.** The agent stops, shows a draft (title, steps, evidence) and waits for `gate: file bug`. Then
a script creates the Bug, the normal triage runs on it, the repro outcome is posted by `jira-repro.mjs`, and the test gets
`@BUG:<KEY>`. The test never silently asserts buggy behaviour without a ticket. A bug met twice under different wording is
a test of triage (does it list the first ticket as possibly related).

**Stop rules.** 60 active minutes per session; the healer gets at most 3 attempts per failing test; `verify` that stays
flaky after its 3 runs goes to the human. On any stop the agent writes what it tried and asks.

**Who writes the POM.** The generator agent gets edit access to `pages/` and viewport resize (in v1 it had neither and left
`TODO(pom)` locators for the main session to move). If it still fails, the main session takes over and that is recorded as a
result.

## Loop acceptance criteria

The loop is considered set up when all of these pass in v2, and reproducible when they pass again in v3.

- **L-01** `/scout-feature` produces a plan whose every fact is marked verified-live or assumed, plus a go/no-go.
- **L-02** `/create-story` produces a Story in the template, with groups and acceptance criteria, and changes no status.
- **L-03** `/implement-ticket` refuses a ticket that is not In Progress.
- **L-04** For an approved group, `/implement-ticket` produces a branch `ZED-N-...` with a raw commit, tests that pass `verify`,
  lint, tsc and format check, with at most 2 interventions.
- **L-05** A stop rule fires and the agent asks instead of continuing.
- **L-06** `/address-review` answers every classified review comment, with a fix or a reason.
- **L-07** `/group-retro` turns each finding class into a rule, lint check or command change; that class does not recur in the
  next group.
- **L-08** A bug found during the work reaches Jira only after `gate: file bug`, goes through triage and repro, and gets a
  `@BUG:<KEY>` test.
- **L-09** The same bug reported twice under different wording: triage lists the first ticket as possibly related (or the
  miss is recorded as a triage finding).
- **L-10** Every session gets its metrics row without manual input except `human_review_min`.
- **L-11** A human-written Story goes through steps 2-5 with no command changes.
- **L-12** `/fix-test` names a root cause class for a failing test before changing code.

## Metrics

Per session (automatic, `scripts/session-cost.mjs` over `~/.claude/projects/<project>/<session>.jsonl` and
`<session>/subagents/*.jsonl`):

- model and effort actually used (read from the transcript, not from the plan); input, cache-creation, cache-read and output tokens (kept separate: they are priced differently);
  API-equivalent dollars from `metrics/prices.json` (official prices with the date copied; on a subscription this is "what it would
  cost through the API", not what was paid)
- active minutes (gaps between events, each capped at 5 minutes)
- interventions and gates (user messages after the start command; `gate:` ones are gates), budget stops
- MCP calls per server and the tokens their results took

The transcript repeats streamed messages (checked: 3193 lines with `usage`, 1065 unique message ids in one session), so the script
deduplicates by message id. It is validated once against Claude Code's `/cost` before being trusted.

Per group (automatic, `scripts/loop-metrics.mjs` from git, `gh` and the Jira changelog):

- tests added; POM members new vs reused
- `human_edits`: lines changed by the human between the raw commit and the merge (agent fix commits excluded)
- review findings by class; recurrence against earlier groups
- `verify` verdict; CI result after merge
- lead time per phase from the Jira label changelog (where waiting happens: agent or human)

Per area and iteration: plan coverage (`scripts/plan-coverage.mjs`: planned / implemented / missing by priority), accepted tests,
cost per accepted test, oracle error rate (plan facts marked verified that later proved wrong in implementation or review),
bugs found and whether triage linked the duplicates.

Maintenance: `metrics/fixes.csv` per fixed test (class, root cause found, attempts, minutes, Currents data used, systematic
debugging used). Stability: weekly Currents snapshot per area tag in `metrics/stability.csv` (flaky rate, failure rate, p95
duration, test executions used of the 10K cycle).

Typed by hand, per gate, rough: `human_review_min`; per session: `mcp_decisive` (did an MCP result change a decision, one line).

## Stages

### Stage 6 - Measurement

- [ ] `scripts/session-cost.mjs` (dedup, token classes, active minutes, interventions and gates, MCP calls), validated against `/cost`
- [ ] Read `effort` / `perTurnEffort` from the transcript into `sessions.csv` and compare with the pinned value
- [ ] `metrics/prices.json` from the official pricing page, dated
- [ ] v1 totals from the four existing sessions into `specs/retrospective.md` (closes its "cost not measured" gap)
- [ ] `scripts/plan-coverage.mjs`
- [ ] `scripts/loop-metrics.mjs` (git diff between raw commit and merge, PR review comments by class, Jira label changelog)
- [ ] `metrics/` layout: `sessions.csv`, `groups.csv`, `fixes.csv`, `stability.csv`

### Stage 7 - Build the loop

- [ ] Commands in `.claude/commands/`: `scout-feature`, `create-story`, `implement-ticket`, `address-review`, `group-retro`, `fix-test`;
      each states its input, output, stop rules and constraints, ends at its gate, and pins `model` and `effort` per `## Model and effort`
- [ ] Story template (scope, groups, reuse map, constraints, acceptance criteria, out of scope)
- [ ] `scripts/jira-create.mjs --type=Story|Subtask|Bug` on `jira-common.mjs`; new story state labels; the marker on every write
- [ ] Generator agent: edit access to `pages/`, viewport resize
- [ ] Ringtones rules before any code: area tag `@ringtones` in `src/utils/tags.ts`, page-object location, naming
- [ ] CI: a job that runs the full suite when a PR gets the `regression` label (PR still runs `@smoke`)
- [ ] Confirm that the pinned effort is the effort actually used, including after a follow-up message in the same session
- [ ] Dry run of every command on a trivial target before the pilot; fix what breaks, log it

### Stage 8 - v2 pilot (ringtones)

- [ ] Steps 1-5 for 3-4 groups; metrics row per session and per group
- [ ] Go/no-go after scouting: if guest ringtones have no free download or preview does not play headless, narrow the scope
      before the Story
- [ ] Story entry: one human-written Story for a small ringtones slice through steps 2-5 (L-11)
- [ ] Experiment A, Currents MCP value: a seeded flake that fails only in CI (no trace in git history or docs, neutral commit
      messages), CI run several times so Currents has history, then two fresh sessions of `/fix-test`: with the Currents MCP and
      without. Compare tokens, minutes, tool calls, correct root cause. 2-3 runs per arm is an anecdote; the report says so
- [ ] Bare control: one group done by Claude with the Story text only, in a worktree without `CLAUDE.md`, `.claude/` and
      `specs/` (Playwright MCP kept). Same metrics. Answers "is the harness needed at all"

### Stage 9 - v2 report

- [ ] Loop acceptance criteria: pass / fail per `L-XX`, with evidence
- [ ] H1-H4 with the numbers; what each tool gave and what had to be changed in it and why
- [ ] Update `specs/retrospective.md` (v2 section, playbook corrections) and `specs/summary.md`
- [ ] Friction log for Currents (below) and the write-up link to the Currents contact

### Stage 10 - v3 replay

- [ ] Isolation: a fresh clone in a different path (no Claude memory or transcripts of v2), `--depth 1` from a `v3-base` branch
      without the ringtones plan, pages and tests; the agent must not fetch other branches or search Jira for ringtones
      before its own repro. Audited afterwards from the transcripts (`git log` / `fetch` / Jira searches)
- [ ] Steps 1-5 on the same scope with the improved harness; the same metrics
- [ ] Optional: experiment B, the skill's value (one group with and without the preloaded skill, same base)
- [ ] Compare v2 vs v3: coverage, bugs re-found, interventions, findings by class, cost per accepted test, active minutes
- [ ] Decision (see Hypotheses); extract the reusable kit (commands, scripts, `CLAUDE.md` template, one project config with the
      Jira project, area tags and constraints)

## Friction log for Currents

Dated, one line each, what got in the way of the loop:

- 2026-09-28: `CURRENTS_API_KEY` (MCP) and `CURRENTS_RECORD_KEY` (reporter) are two different keys.
- 2026-09-28: `${VAR}` in `.mcp.json` only expands from the real OS environment, not from a project settings file.
- 2026-09-30: guest accounts are read-only; the usage counter includes local runs and `verify` repeats.

## Status

- [ ] Stage 6: measurement
- [ ] Stage 7: loop built, commands dry-run
- [ ] Stage 8: v2 pilot, Story entry, experiment A, bare control
- [ ] Stage 9: v2 report, L-XX results
- [ ] Stage 10: v3 replay, comparison, decision, reusable kit
