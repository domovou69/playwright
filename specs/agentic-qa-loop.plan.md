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
- [ ] Check Currents' **Insights & Analytics** (flake rate, failure history, performance trends) once enough
      runs have accumulated — this may already satisfy Stage 1/5's "flaky duration" and "what's broken" goals
      without extra tooling

Deviated from Currents' own doc in one place: kept `screenshot: 'only-on-failure'` instead of their recommended
`screenshot: 'on'` — no value in a free tier in screenshotting every passing test.

**Output of this stage:** a working, populated Currents.dev dashboard we can actually look at — real data, not
a hypothetical.

### Stage 2 — Jira signal intake (triage, read-only actions only)

Trigger: **Jira webhook**, event-driven — not polling. Two event types matter, not just ticket creation:

- [ ] Webhook on `issue_created` — runs the full triage flow below on a brand-new ticket
- [ ] Webhook on `issue_updated` (status transitions) — needs **smart handling, not "trigger once"**: - a transition _into_ a status that means "someone should act" (e.g. `To Do → In Progress`, or
      `Blocked → In Progress` once the blocker clears) should re-run the relevant triage/repro step - a transition that's just noise (e.g. bouncing `In Progress → Blocked → In Progress → To Do` within a
      short window without new information) should **not** re-trigger the full pipeline every single time —
      needs debounce/dedup logic (e.g. only act on a transition if the ticket's content/comments changed
      since the last time this pipeline ran, or if enough time passed since the last run) - open design question: what counts as "new information" worth re-triggering vs. pure status churn —
      needs a concrete rule before this is buildable, not just "be smart about it"
- [ ] Stand up Jira MCP (API token + project scoping to `ZED`)
- [ ] Define machine-readable status/label vocabulary tickets move through, e.g.:
      `needs-triage → duplicate-suspected / needs-repro / repro-confirmed / auto-fix-proposed / needs-human-review`
- [ ] Build duplicate/already-fixed check: search existing tickets + git log/CHANGELOG for the reported symptom
      before anything else happens — **risk, not a solved step**: Jira full-text search misses paraphrased/
      differently-worded duplicates, so this is a best-effort assist for the human, never treated as
      authoritative
- [ ] Every triage action is a **comment + label change**, never an auto-close — human confirms duplicates/
      won't-fix decisions
- [ ] Every automated comment is prefixed with a visible marker, e.g. `[agent - Claude Sonnet 5]`, so it's
      instantly distinguishable from a manual comment even though it posts under the personal account (see
      personal-token note below)

**Output of this stage:** new bug tickets arrive pre-triaged (possible duplicate flagged, version-support
checked) before a human looks at them, and re-triage happens sensibly on meaningful status changes instead of
either "once ever" or "on every single status bounce."

### Stage 3 — Reproduction (production, no staging exists)

**Reality check: Zedge has no staging environment** — only production (`zedge.net`). Repro runs happen directly
against production, under the same constraints already established for this project's test suite (see
`specs/wallpapers.plan.md` / the Explorbot experiment's isolation rules): guest-accessible flows only, no
destructive actions, no completed purchases, no login/account mutation. This removes the `STAGING_BASE_URL`
open question entirely — there's nothing to configure beyond the existing `BASE_URL`.

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

| Variable              | Used in            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CURRENTS_RECORD_KEY` | Stage 1            | Secret — kept only in `.env` locally and as a **GitHub Actions secret** for CI; never in `currents.config.ts` (project ID `OOKVTP` is hardcoded there instead, per Currents' own convention, since it isn't sensitive)                                                                                                                                                                                                                                                                                                                                                                                                 | local: done, CI secret: **needs manual setup in GitHub repo settings**                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `CURRENTS_API_KEY`    | Stage 4+           | **Different key from `CURRENTS_RECORD_KEY`** — used by `@currents/mcp` (agent tool access) and the native Jira integration. Needs Read & Write permission for Jira write operations (creating/linking issues); Read Only suffices for querying flakiness/failure data. **Not readable from `.env`** — `.mcp.json`'s `${CURRENTS_API_KEY}` only expands from the shell env or `.claude/settings.json`/`.claude/settings.local.json`'s `env` block, never from a project `.env` (confirmed against Claude Code's own docs, no `envFile` support exists — anthropics/claude-code#28942 is an open feature request for it) | value set in `.claude/settings.local.json` (gitignored), MCP server declared in `.mcp.json` — needs a Claude Code session restart to pick up. **Local/interactive-session use only** — CI never needs this (CI only uses `CURRENTS_RECORD_KEY` for the reporter, not the MCP server). When Stage 2+ eventually runs the agent autonomously (not from an interactive session), this key will need to live in whatever secret store that runner uses instead — open question, not solved here |
| `JIRA_BASE_URL`       | Stage 2+           | `https://domovou69.atlassian.net`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `JIRA_PROJECT`        | Stage 2+           | `ZED`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `JIRA_API_TOKEN`      | Stage 2+           | Personal account token, not a dedicated service account — see note below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `JIRA_EMAIL`          | Stage 2+           | Atlassian account email the token belongs to (Jira Cloud auth is email+token, not token alone)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `BASE_URL`            | Stage 3 + existing | `https://www.zedge.net/`, hardcoded as the default in `playwright.config.ts` (env override still possible, but no longer required in CI — removed from `.github/workflows/ci.yml`). Doubles as the Stage 3 repro target since no staging exists                                                                                                                                                                                                                                                                                                                                                                        | done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

No staging environment exists for Zedge — resolved by using production directly for repro (see Stage 3), under
the same guest-only/no-destructive-action constraints the test suite already follows elsewhere in this repo.

Open question still blocking Stage 2: the exact debounce/dedup rule for status-transition webhooks (see Stage 2
above) — "smart" isn't yet a concrete rule.

**Personal token + comment marker:** `JIRA_API_TOKEN`/`JIRA_EMAIL` are your own personal Atlassian credentials,
not a service account — automated comments post under your name. Mitigated by prefixing every automated comment
with `[agent - Claude Sonnet 5]` (see Stage 2) so it's visually unmistakable in the ticket history which
comments were you and which were the agent, without needing a separate service account.

## Status

- [ ] Stage 1: Currents.dev free tier wired into `playwright.config.ts`
- [ ] Stage 2: Jira MCP + triage vocabulary
- [ ] Stage 3: staging repro flow
- [ ] Stage 4: test/fix generation via existing skills
- [ ] Stage 5: review/feedback loop + dashboard
