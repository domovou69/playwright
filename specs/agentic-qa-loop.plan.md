# Agentic QA Loop Plan

## Goal — what we get at the end

A closed loop connecting **Jira (signal source) ↔ test analytics (state/history) ↔ Playwright agents (execution)
↔ human (validation gate)**, so that:

- Incoming bugs are triaged against existing tickets/known-fixed/unsupported-version before anyone spends time
  on them.
- New tests get written using the existing POM/skills (no duplicate locators/helpers), always traceable back to
  the Jira ticket that prompted them.
- Failing/flaky tests get diagnosed (real regression vs. flake vs. stale locator) and fixed, with the decision
  always confirmed by a human, never auto-closed.
- Anyone can open one dashboard and see: what's currently broken, what's new since last review, what got fixed
  but never verified, flaky tests and how long they've been flaky, and where the AI's proposals fit into all
  that (agentic audit trail).

Explicit non-goal: not building a full test-management platform from scratch (see `## Why Currents.dev, not
build-your-own` below). Coverly (github.com/domovou69/coverly) is optional/future — a thin orchestration layer
on top of this, not part of this plan's scope.

Jira project already created: **ZEDGE (key: ZED)**.

## Why Currents.dev, not build-your-own

Test history/flaky-detection/dashboards is a solved problem (ReportPortal, Allure TestOps, Testomat.io, Currents
all do it). The unique part worth building ourselves is the agentic layer (auto-repro, auto-fix proposals,
skill/POM reuse) — not stats storage. Currents.dev chosen for stage 1 because:

- Native Playwright reporter (`@currents/playwright`), no self-hosted infra to run/maintain
- Free tier available — validates the idea at $0 before committing to anything paid or self-hosted
- Gives flaky-detection, run history, timing out of the box, with an API to pull data back into any future
  orchestration layer

If the free tier's limits (test runs/month) prove too restrictive, fallback is self-hosted ReportPortal
(more powerful, more ops overhead) — documented as a fallback, not pursued unless stage 1 hits a wall.

## Currents-native features that reshape this plan

Docs checked 2026-09-28. These weren't known when Stages 2/4/5 were first written and change what needs to be
hand-built vs. reused:

**1. `@currents/mcp` — official MCP server.** Exposes projects/runs/test results/flakiness/duration/error-rate
data as tools an AI agent can query directly (`npm install @currents/mcp`, needs `CURRENTS_API_KEY` — a
**different** key from `CURRENTS_RECORD_KEY`, with Read Only vs. Read & Write permission levels). Can also
cancel/reset runs. **Action: install this for the agent session** doing Stage 4/5 work, instead of hand-rolling
an API client to pull flakiness data — this is the actual integration point that was left as an open "API"
bullet before.

**2. Native Jira integration** (Currents → "Currents for Jira" Atlassian Marketplace app). Does two things:
creates a new Jira issue from a test failure (with error, stack trace, metadata, test history attached
automatically), or links a failure to an _existing_ ticket with a context comment. Requires enabling in Currents
project settings + installing the Atlassian Marketplace app + a Read & Write `CURRENTS_API_KEY` for write
operations. **Explicitly does not sync ticket status back to quarantine** — one-directional, Currents → Jira
only.

This is the mirror direction of what Stages 2–4 planned (Jira ticket → repro → test), and meaningfully
overlaps with Stage 4/5's "tag failing test with ticket ID for traceability" and "attach evidence" work — worth
using this native path for **regression-test-failure → Jira** instead of hand-building that comment/link logic,
reserving the custom Jira MCP work in Stage 2 for the **Jira ticket → repro → new test** direction only, which
has no native Currents equivalent.

**3. Currents Actions — rule-based automation.** Triggers on flakiness/duration/failure-rate/tag/age
conditions; can skip tests, quarantine tests, add tags, or send alerts. **Open question, not yet confirmed**:
whether "quarantine" only affects dashboard reporting or actually skips the test's real execution — this
matters a lot given this plan's non-negotiable rule that no test/bug decision is ever made without a human
(`## Validation gates`). If quarantine silently skips real execution, it cannot be used as an autonomous action
here — at most as a proposal a human approves, same as everything else in this plan. **Needs to be verified
empirically (configure one rule, observe actual behavior) before relying on it for Stage 5**, not assumed safe
from the doc summary alone.

## Stages

### Stage 1 — Currents.dev free tier, baseline analytics (current focus)

- [x] Sign up for Currents.dev free tier, get project ID + record key (project `OOKVTP`)
- [x] Add `@currents/playwright` reporter to `playwright.config.ts` + `currents.config.ts`
- [x] Run existing suite (`tests/wallpappers/wallpapers-filters.spec.ts`) against it, confirm results land in
      the Currents dashboard — 13/13 passed, run visible at `https://app.currents.dev/run/d01bec858c163f66`
- [x] Run the full suite (not just one spec file) to get a real baseline — all 9 spec files, 32/32 passed,
      1m26s, run visible at `https://app.currents.dev/run/6a691674937bb140`
- [ ] Evaluate against free-tier limits: how many runs/month we actually burn through CI + local runs.
      **Flag:** Currents' public pricing page (checked 2026-09-28) no longer lists a free plan — only Scale
      ($49/mo), Business ($99/mo), Enterprise. Whatever tier the signup landed on (trial vs. a real free plan,
      and its exact limits/expiry) needs to be checked directly in the Currents dashboard's
      Settings → Billing, not assumed from the earlier onboarding email
- [ ] Decision gate: is free tier sufficient, or do we hit limits fast enough to need ReportPortal/paid tier
- [x] Research Currents' AI/automation features (docs checked 2026-09-28) — **significant findings, see
      `## Currents-native features that reshape this plan` below**: an official MCP server, a native Jira
      integration, and rule-based "Currents Actions" all exist and overlap with what Stage 2/4/5 planned to
      hand-build
- [x] Check Currents' **Insights & Analytics** via `@currents/mcp` (finally connected 2026-09-28, after
      diagnosing that `.mcp.json`'s `${VAR}` expansion needs the real OS env — `.claude/settings.local.json`
      doesn't feed it — fixed via `launchctl setenv` + full VSCode restart, see the `CURRENTS_API_KEY` row
      below). `currents-get-project-insights` (Sep 1–29) confirms this **fully satisfies** Stage 1/5's "flaky
      duration"/"what's broken" goal with zero extra tooling: 3 runs, 77 tests, 0 failures, 0 flaky, 100% pass
      rate, p50/p90/p95 duration 7.9s/21.1s/23.7s per test. Bonus finding: `currents-get-runs` shows a 3rd run
      (`37d42fd720d67257`, linux/Ubuntu 24.04) that fired from CI automatically — confirms the CI → Currents
      wiring from the earlier `CURRENTS_RECORD_KEY` fix works end-to-end, not just locally

Deviated from Currents' own doc in one place: kept `screenshot: 'only-on-failure'` instead of their recommended
`screenshot: 'on'` — no value in a free tier in screenshotting every passing test.

**Output of this stage:** a working, populated Currents.dev dashboard we can actually look at — real data, not
a hypothetical.

### Stage 2 — Jira signal intake (triage, read-only actions only)

**Trigger strategy changed 2026-09-28: manual/on-demand, not event-driven.** The event-driven design (Jira
Automation → GitHub `repository_dispatch` on created/transitioned/edited) was worked out in detail and then
deliberately dropped before implementation — decided that reacting to Jira events live is not yet the valid
case to build for. Replaced with: **`workflow_dispatch`** (a human clicks "Run workflow" in GitHub, or
`gh workflow run`), with a `schedule:` cron trigger to be added later once the manual flow is proven. No Jira
Automation rules, no "Send web request" bridging, no GitHub PAT stored in Jira — none of that infrastructure is
needed anymore, since nothing outside GitHub initiates a run.

**What this changes concretely:**

- [x] `.github/workflows/jira-triage.yml` is `on: workflow_dispatch` with an `issueKey` input (comma-separated,
      whitespace-tolerant list, or blank to scan all candidates) — implemented, tested locally against real
      Jira data. **Not yet tested as an actual GitHub Actions run** (only via direct `node scripts/jira-triage.mjs`
      invocation locally with `.env`) — see next steps below
- [x] GitHub Actions secrets/vars added (`JIRA_API_TOKEN` as secret, `JIRA_BASE_URL`/`JIRA_PROJECT`/`JIRA_EMAIL`
      as vars) — confirmed done by user
- [x] JQL query decides candidates each run (`scripts/jira-triage.mjs`, `findCandidates`) — implemented, see the
      scope/scale notes below for how it's actually split into two bounded queries
- [x] Empty-ticket non-issue by construction — implemented (`triageOne` checks live `description` content,
      skips quietly if empty)
- [x] Idempotency guard implemented (`alreadyHandledSinceLastUpdate`) — skips re-processing when an agent
      comment already exists posted after the issue's last update, with a cheap short-circuit (no API call) for
      tickets that never got a pipeline label in the first place

Everything else in this stage (duplicate/already-fixed check, label vocabulary, comment marker, human
confirmation gates) is unaffected by this change — only _how the job starts_ changed, not what it does once
running.

- [x] Verified `JIRA_API_TOKEN`/`JIRA_EMAIL`/`JIRA_BASE_URL` work against the real Jira REST API (checked
      2026-09-28): `GET /rest/api/3/project/ZED` returns project id `10034`. Issue types: Subtask, Epic, Story,
      Bug, Task. Statuses match this stage's assumptions exactly: To Do, In Progress, Done, Blocked. One
      pre-existing unrelated ticket found (`ZED-1`, no labels) — not part of this experiment.
- [x] No separate "Jira MCP" server needed for the **automated** path — the `workflow_dispatch` workflow calls
      the Jira REST API directly (`scripts/jira-triage.mjs`, plain `fetch`), which is simpler for a headless CI
      job than standing up an MCP server. An interactive Jira MCP (for me to browse/query tickets
      conversationally with the user, distinct from the automated pipeline) remains a separate, optional,
      not-yet-done addition — same local-vs-automated split already noted for `CURRENTS_API_KEY`
- [x] Label vocabulary defined and implemented as `PIPELINE_LABELS` in `scripts/jira-triage.mjs`:
      `duplicate-suspected`, `needs-repro`, `repro-confirmed`, `auto-fix-proposed`, `needs-human-review`. A
      ticket with none of these is implicitly "needs-triage" (no separate label needed for that state — absence
      of a pipeline label already means it hasn't been through this pipeline)
- [x] Build duplicate/already-fixed check: search existing tickets (Jira `text ~` title search) + `git log
--all --grep` keyword search across commit messages for the reported symptom (`scripts/jira-triage.mjs`,
      `findPossibleDuplicates` + `findPossibleFixCommits`) — **risk, not a solved step**: both are best-effort
      keyword matches (Jira search misses paraphrased duplicates, git log rarely echoes a bug title verbatim),
      always surfaced as an unverified hint in the comment, never treated as authoritative or used to
      auto-resolve anything. Requires `actions/checkout` with `fetch-depth: 0` in CI (shallow clone would only
      see the latest commit) — already set in `jira-triage.yml`
- [x] Every triage action is a **comment + label change**, never an auto-close — implemented (`addLabel` +
      `postComment` only; the script never touches `status` or transitions/resolves anything)
- [x] Every automated comment is prefixed with `[agent - Claude Sonnet 5]` (`AGENT_MARKER` in
      `scripts/jira-triage.mjs`) — instantly distinguishable from a manual comment even though it posts under
      the personal account (see personal-token note below)

**Both remaining gaps closed 2026-09-29, verified end-to-end on real data:**

- [x] Ran for real as a GitHub Actions job via `workflow_dispatch` (not just local `node
scripts/jira-triage.mjs`) — secrets/vars resolved correctly, `fetch-depth: 0` checkout worked, run
      finished green
- [x] Write path exercised against a real ticket: created `ZED-2` (Bug, real description: "Ad interstitial
      blocks wallpaper download button on mobile") via the Jira API, ran the workflow against it. Result:
      labeled `needs-repro`, posted the marked comment, found 5 keyword-matching commits via the git-log search
      (correctly surfaced as unverified, not auto-resolved) — duplicate-check, fix-commit search, `addLabel`,
      and `postComment` all confirmed working, and confirmed via a direct Jira API read (label present, status
      untouched at `To Do`), not just trusting the CI log
- [x] Idempotency guard verified too: re-ran against `ZED-2` a second time — correctly skipped
      ("already triaged, no changes since") instead of re-labeling/re-commenting

**Scope boundary, decided 2026-09-28: `Task`/`Story`/`Epic` tickets are explicitly out of scope for this
pipeline, not an oversight.** This pipeline's whole shape (duplicate check → repro → regression test) only maps
onto bugs, which have a well-defined lifecycle. A `Task` ("refactor the framework", "plan a feature") has no
equivalent universal automatable path — it needs human prioritization or product context this project
deliberately doesn't have (it's a pure test-automation black box, not connected to product planning). If
task-type automation is ever wanted, it should be a **separate pipeline** with its own logic (e.g. complexity
estimate, epic linking, readiness checklist), not an extension bolted onto `triageOne()` — mixing the two would
blur a clean bug-shaped function into a vague general-purpose one. `scripts/jira-triage.mjs`'s `issuetype = Bug`
JQL filter enforces this boundary already; an explicitly-named `issueKey` input bypasses the type filter on
purpose (a human asking for a specific ticket by name is a deliberate override, not scope creep).

**Output of this stage:** new bug tickets arrive pre-triaged (possible duplicate flagged, version-support
checked) before a human looks at them, and re-triage happens sensibly on meaningful status changes instead of
either "once ever" or "on every single status bounce."

### Stage 3 — Reproduction (production, no staging exists)

**Reality check: Zedge has no staging environment** — only production (`zedge.net`). Repro runs happen directly
against production, under the same constraints already established for this project's test suite (see
`specs/wallpapers.plan.md` / the Explorbot experiment's isolation rules): guest-accessible flows only, no
destructive actions, no completed purchases, no login/account mutation. This removes the `STAGING_BASE_URL`
open question entirely — there's nothing to configure beyond the existing `BASE_URL`.

**Known gap, not addressed here:** this suite only covers desktop browser layout. Real mobile-web bugs (Android/
iOS browser, different layout entirely) are out of scope — a mobile-reported bug reaching Stage 3 cannot
actually be reproduced by this pipeline yet. Noted so it isn't rediscovered by surprise later; not solved as
part of this plan.

- [ ] From a ticket's (possibly incomplete) description, reconstruct candidate repro steps
- [ ] Run candidate steps via Playwright MCP against production (`BASE_URL`), respecting the no-destructive-
      action constraints above
- [ ] Three explicit outcomes, each a distinct label + attached evidence (trace/screenshot/log):
      reproduced / not-reproduced / inconclusive (env or flake noise)
- [ ] "Not reproduced" never becomes "not a bug" automatically — routes to `needs-manual-repro`

**Output of this stage:** a ticket that reaches a human already has an attempted repro with evidence attached,
cutting the manual reproduction step most of the time.

### Stage 4 — New tests + fixes, using existing POM/skills

- [ ] Confirmed-reproduced bugs first go through `playwright-test-planner` to turn the ticket into a concrete
      scoped test plan (steps + expectations), before any code is written
- [ ] Regression test written via `playwright-test-generator` skill/POM (search-before-write, no duplicate
      locators/helpers), following `playwright-best-practices` throughout (this applies to every test
      write/edit in this stage, not only new-test generation)
- [ ] New/failing test always tagged with the Jira ticket ID for traceability
- [ ] Failing/flaky existing tests triaged via `playwright-test-healer`, using `systematic-debugging` (the
      global 4-step verification skill — confirm exact name if this isn't it) to root-cause before proposing a
      fix: real regression vs. flake vs. stale locator — this distinction is a labeled decision, not silently
      auto-fixed away
- [ ] Fix + test go into a PR; agent never merges

**Output of this stage:** every confirmed bug gets a permanent regression test, and every fix is traceable
ticket → test → PR.

### Stage 5 — Review, feedback, and closing the loop back into the system

- [ ] Before requesting human review, agent self-runs new/changed tests a **fixed, capped number of times**
      (default: 3 — an arbitrary but reasonable starting point, not a derived number: 1 run tells you nothing
      about flakiness, 2 barely more, 3 gives a minimal majority signal — e.g. 2/3 pass flags real instability —
      while keeping the cost multiplier low for e2e browser tests, which aren't cheap to repeat. Not tied to
      "locally" specifically — this applies wherever the agent runs the tests, CI or local. Use Playwright's
      built-in `--repeat-each=3` rather than a custom retry loop. Revisit the number once real flake-rate data
      exists from Stage 1's Currents.dev history) to catch obvious flakiness — not open-ended "N", to avoid
      runaway time/token/CI-minute cost. If still inconsistent after the cap, label `flaky-unconfirmed` and hand
      to a human rather than retrying further
- [ ] PR description auto-includes: repro steps used, what changed, why, related tests that could be affected
- [ ] Reviewer corrections (e.g. "don't use waitForTimeout, use our helper") get captured back into
      `CLAUDE.md`/skills, not re-litigated on the next PR
- [ ] Dashboard (Currents.dev + Jira together) surfaces: new since last review, fixed-but-unverified, flaky
      duration — the "what changed" view for a QA lead

**Output of this stage:** the full loop — signal in, triage, repro, fix, test, review, feedback — with a human
decision point at every irreversible step (duplicate/won't-fix, bug confirmation, fix correctness) and a single
place to see the state of it all.

## Validation gates (apply across every stage — non-negotiable)

- Duplicate / won't-fix / unsupported-version decisions: **human confirms**, agent only proposes
- Bug reproduction: **human confirms** when the agent's result is not-reproduced or inconclusive
- Code fix correctness: **human reviews and merges**, agent never merges
- No ticket is ever auto-closed by the agent

## Required environment variables

Consolidated here rather than scattered per stage, so setup is a single checklist:

| Variable              | Used in            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CURRENTS_RECORD_KEY` | Stage 1            | Secret — kept only in `.env` locally and as a **GitHub Actions secret** for CI; never in `currents.config.ts` (project ID `OOKVTP` is hardcoded there instead, per Currents' own convention, since it isn't sensitive)                                                                                                                                                                                                                                                                                                                                                                                                 | local: done, CI secret: **needs manual setup in GitHub repo settings**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `CURRENTS_API_KEY`    | Stage 4+           | **Different key from `CURRENTS_RECORD_KEY`** — used by `@currents/mcp` (agent tool access) and the native Jira integration. Needs Read & Write permission for Jira write operations (creating/linking issues); Read Only suffices for querying flakiness/failure data. **Not readable from `.env`** — `.mcp.json`'s `${CURRENTS_API_KEY}` only expands from the shell env or `.claude/settings.json`/`.claude/settings.local.json`'s `env` block, never from a project `.env` (confirmed against Claude Code's own docs, no `envFile` support exists — anthropics/claude-code#28942 is an open feature request for it) | **Working (verified 2026-09-28):** `.claude/settings.local.json`'s `env` block does **not** feed `.mcp.json`'s `${VAR}` expansion (confirmed via `ps eww` on the spawned subprocess — literal unexpanded `${CURRENTS_API_KEY}` was passed through). Fix that actually worked: `launchctl setenv CURRENTS_API_KEY "<value>"` in Terminal.app, then fully quit VSCode (Cmd+Q, not "Reload Window") and relaunch — confirmed via `currents-get-projects` MCP call succeeding (returns project `OOKVTP`). `.claude/settings.local.json` is harmless to keep (still gitignored) but doesn't solve this specific problem. **Local/interactive-session use only** — CI never needs this (CI only uses `CURRENTS_RECORD_KEY` for the reporter, not the MCP server). When Stage 2+ eventually runs the agent autonomously (not from an interactive session), this key will need to live in whatever secret store that runner uses instead — open question, not solved here |
| `JIRA_BASE_URL`       | Stage 2+           | `https://domovou69.atlassian.net`. Read by `.github/workflows/jira-triage.yml` from `vars.JIRA_BASE_URL`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | local: done, **CI var: needs manual setup** (Settings → Secrets and variables → Actions → Variables)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `JIRA_PROJECT`        | Stage 2+           | `ZED`. Read by the workflow from `vars.JIRA_PROJECT`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | local: done, **CI var: needs manual setup**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `JIRA_API_TOKEN`      | Stage 2+           | Personal account token, not a dedicated service account — see note below. **Trigger strategy changed to `workflow_dispatch`/manual** (see Stage 2) — this means the CI job itself now calls Jira, so this needs to become a **GitHub Actions secret** too, not just local `.env`. Read by the workflow from `secrets.JIRA_API_TOKEN`                                                                                                                                                                                                                                                                                   | local: done, **CI secret: needs manual setup**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `JIRA_EMAIL`          | Stage 2+           | Atlassian account email the token belongs to (Jira Cloud auth is email+token, not token alone). Read by the workflow from `vars.JIRA_EMAIL`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | local: done, **CI var: needs manual setup**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `BASE_URL`            | Stage 3 + existing | `https://www.zedge.net/`, hardcoded as the default in `playwright.config.ts` (env override still possible, but no longer required in CI — removed from `.github/workflows/ci.yml`). Doubles as the Stage 3 repro target since no staging exists                                                                                                                                                                                                                                                                                                                                                                        | done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

No staging environment exists for Zedge — resolved by using production directly for repro (see Stage 3), under
the same guest-only/no-destructive-action constraints the test suite already follows elsewhere in this repo.

**Personal token + comment marker:** `JIRA_API_TOKEN`/`JIRA_EMAIL` are your own personal Atlassian credentials,
not a service account — automated comments post under your name. Mitigated by prefixing every automated comment
with `[agent - Claude Sonnet 5]` (see Stage 2) so it's visually unmistakable in the ticket history which
comments were you and which were the agent, without needing a separate service account.

## Status

- [x] Stage 1: Currents.dev wired in and verified end-to-end (local + CI); only the free-tier billing/limits
      check in the Currents dashboard itself remains open (needs manual login, can't be checked via API/MCP)
- [x] Stage 2: Jira triage script built and verified end-to-end on real data (real CI run, real ticket, real
      write path, idempotency confirmed)
- [ ] Stage 3: reproduction flow (production, no staging)
- [ ] Stage 4: test/fix generation via existing skills
- [ ] Stage 5: review/feedback loop + dashboard
