# Agentic QA Loop Plan

First iteration, finished. The next one (new feature area, with measurements) is `specs/agentic-qa-loop-v2.plan.md`.

## Goal — what we get at the end

A closed loop connecting **Jira (signal source) ↔ test analytics (state/history) ↔ Playwright agents (execution)
↔ human (validation gate)**, so that:

- Incoming bugs are triaged against existing tickets/known-fixed/unsupported-version before anyone spends time
  on them.
- New tests get written using the existing POM/skills (no duplicate locators/helpers), always traceable back to
  the Jira ticket that prompted them.
- Failing/flaky tests get diagnosed (real regression vs. flake vs. stale locator) and fixed, with the decision
  always confirmed by a human, never auto-closed.
- What's broken, what's flaky and for how long is visible in the ready-made Currents.dev dashboard; Jira labels
  (`needs-repro`, `flaky-unconfirmed`, ...) and the `[agent - Claude]` comments are the audit trail of the AI's proposals.

Explicit non-goal: not building a full test-management platform from scratch (see `## Why Currents.dev, not
build-your-own` below). Coverly (github.com/domovou69/coverly) is optional/future — a thin orchestration layer
on top of this, not part of this plan's scope.

Jira project already created: **ZEDGE (key: ZED)**.

## Why Currents.dev, not build-your-own

Test history/flaky-detection/dashboards is a solved problem (ReportPortal, Allure TestOps, Testomat.io, Currents
all do it). The unique part worth building ourselves is the agentic layer (auto-repro, auto-fix proposals,
skill/POM reuse) — not stats storage. Currents.dev chosen for stage 1 because:

- Native Playwright reporter (`@currents/playwright`), no self-hosted infra to run/maintain
- A free trial (no permanent free plan) — validates the idea at $0 before committing to anything paid or self-hosted
- Gives flaky-detection, run history, timing out of the box, with an API to pull data back into any future
  orchestration layer

If the trial ends and a paid plan is not worth it, the free alternative to try is self-hosted ReportPortal
(more ops overhead, no per-test limits); to be tried as a separate experiment (Stage 1).

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

### Stage 1 — Currents.dev trial, baseline analytics

- [x] Sign up for a Currents.dev trial, get project ID + record key (project `OOKVTP`)
- [x] Add `@currents/playwright` reporter to `playwright.config.ts` + `currents.config.ts`
- [x] Run existing suite (`tests/wallpapers/wallpapers-filters.spec.ts`) against it, confirm results land in
      the Currents dashboard — 13/13 passed, run visible at `https://app.currents.dev/run/d01bec858c163f66`
- [x] Run the full suite (not just one spec file) to get a real baseline — all 9 spec files, 32/32 passed,
      1m26s, run visible at `https://app.currents.dev/run/6a691674937bb140`
- [x] Checked the plan terms (2026-09-30, Currents docs and the dashboard's Usage section): there is **no free plan**, only a
      14-day trial cycle with a 10K-tests limit (929 used two days in; local runs and `verify` repeats count too). The docs
      say the trial can be extended by contacting Currents; guest accounts are read-only, free and unlimited. What happens
      after the trial is not documented; the suite and `verify` work without Currents (it only adds history, flaky detection
      and the MCP)
- [x] Decision gate: keep Currents while the trial lasts and ask Currents for an extension; nothing is dropped
- [ ] Later, as a separate experiment: self-hosted ReportPortal as a free alternative. Compare on: Playwright reporter, run
      history and flaky detection, access for an AI agent (MCP or API), Jira integration, and the cost of running it
- [x] Research Currents' AI/automation features (docs checked 2026-09-28) — **significant findings, see
      `## Currents-native features that reshape this plan` below**: an official MCP server, a native Jira
      integration, and rule-based "Currents Actions" all exist and overlap with what Stage 2/4/5 planned to
      hand-build
- [x] Check Currents' **Insights & Analytics** via `@currents/mcp` (finally connected 2026-09-28, after
      diagnosing that `.mcp.json`'s `${VAR}` expansion needs the real OS env — `.claude/settings.local.json`
      doesn't feed it; since replaced by `node --env-file-if-exists=.env` in `.mcp.json`, see the
      `CURRENTS_API_KEY` row below). `currents-get-project-insights` (Sep 1–29) confirms this **fully satisfies** Stage 1/5's "flaky
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
- [x] Label vocabulary defined and implemented as `STATE_LABELS` in `scripts/jira-common.mjs` (one state at a time: setting one
      removes the other state labels, labels added by people are never touched; `flaky-unconfirmed` is a separate flag that
      `verify` sets on a flaky `@BUG` test and clears once the ticket's tests are all stable):
      `duplicate-suspected`, `needs-repro`, `repro-confirmed`, `auto-fix-proposed`, `needs-human-review`. A
      ticket with none of these is implicitly "needs-triage" (no separate label needed for that state — absence
      of a pipeline label already means it hasn't been through this pipeline)
- [x] Build duplicate check (`findPossibleDuplicates` in `scripts/jira-triage.mjs`) — **risk, not a solved step**.
      Reworked 2026-09-29: keywords are taken from the title and the description (stop-words, short tokens and
      template boilerplate dropped), Jira gets one `text ~ "word"` per keyword joined with `OR` (a plain `text ~
"<whole title>"` needs every term and finds almost nothing), and candidates are scored locally by shared
      keywords (title words count double, threshold `MIN_SCORE`, at most 5 shown). Keyword overlap gives false
      positives, so it is **only a hint**: triage always applies `needs-repro` and lists the candidates under
      "Possibly related (keyword overlap, not confirmed - judge by meaning)" with the shared terms. It is a plain
      script with no model behind it, so the semantic verdict is the agent's: in a repro session it reads the
      candidates and, if it agrees, records `jira-repro.mjs --outcome=duplicate-suspected --of=ZED-N --reason=...`,
      the only path that sets the `duplicate-suspected` label. Nothing is ever auto-closed or linked as a
      duplicate. `DRY_RUN=1` prints the would-be label and comment without writing. An LLM check inside the
      script (a cheap model on at most 5 pairs per ticket) was considered and postponed: it needs a model API key in
      CI and only pays off once triage runs without a human. A `git log` keyword search for "commits that might
      already fix it" was built first and removed: commit messages say nothing about whether a bug is fixed, it
      only produced noise. Whether a bug still exists is answered by Stage 3 (reproduction on production), not by
      triage
- [x] Every triage action is a **comment + label change**, never an auto-close — implemented (`addLabel` +
      `postComment` only; the script never touches `status` or transitions/resolves anything)
- [x] Every automated comment is prefixed with `[agent - Claude]` (`AGENT_MARKER` in
      `scripts/jira-common.mjs`, shared by the triage and repro scripts) — instantly distinguishable from a manual comment even though it posts under
      the personal account (see personal-token note below)

**Both remaining gaps closed 2026-09-29, verified end-to-end on real data:**

- [x] Ran for real as a GitHub Actions job via `workflow_dispatch` (not just local `node
scripts/jira-triage.mjs`) — secrets/vars resolved correctly, run
      finished green
- [x] Write path exercised against a real ticket: created `ZED-2` (Bug, real description: "Ad interstitial
      blocks wallpaper download button on mobile") via the Jira API, ran the workflow against it. Result:
      labeled `needs-repro`, posted the marked comment, duplicate-check, `addLabel` and `postComment` all confirmed
      working, and confirmed via a direct Jira API read (label present, status
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

**Interactive-only, unlike Stage 2 — not an oversight, an architectural gap.** `scripts/jira-repro.mjs` only
covers the deterministic tail end (upload evidence, post comment, apply the outcome label - plain Jira REST
calls, same shape as `jira-triage.mjs`). The actual content of this stage - reading a ticket's free-text
description and turning it into concrete steps, then driving Playwright MCP against production and reacting to
whatever actually shows up (e.g. picking a different wallpaper card after one turned out to be paid, not free) -
is agent judgment, not scriptable logic. A plain `workflow_dispatch` Node job has no model behind it to make
those calls, so unlike Stage 2 this cannot move into CI as-is. Moving it there would mean standing up an actual
agent runner in CI (Claude Agent SDK or the Claude API driving Playwright MCP headless, with its own
`ANTHROPIC_API_KEY` secret, its own error/timeout handling, real token cost per run) - a distinct, non-trivial
piece of work, not a missing config value. Given the validation gates already require a human on every
not-reproduced/inconclusive result regardless, the payoff of full CI automation here is smaller than it was for
Stage 2's triage. Not decided yet whether/when to build that runner - until then, this stage runs from an
interactive agent session (as it did for ZED-2), the same interactive-vs-automated split already noted for
`CURRENTS_API_KEY` and the interactive Jira MCP idea in Stage 2.

- [x] From a ticket's (possibly incomplete) description, reconstruct candidate repro steps — done by an agent
      interactively (judgment over free text, not a deterministic script): read the ticket via the Jira API,
      turned the description into concrete steps grounded in the actual site/POM
- [x] Run candidate steps via Playwright MCP against production (`BASE_URL`), respecting the no-destructive-
      action constraints above — done via `planner_setup_page` + the raw `browser_*` MCP tools (navigate, resize,
      click, snapshot, screenshot), not a `.spec.ts` file, since this is a one-off exploratory repro, not a
      permanent regression test (that's Stage 4's job, once a bug is confirmed)
- [x] Three explicit outcomes, each a distinct label + attached evidence (trace/screenshot/log):
      reproduced / not-reproduced / inconclusive (env or flake noise) — implemented in `scripts/jira-repro.mjs`
      (`OUTCOME_LABELS`), which also handles the actual Jira attachment upload (multipart, `X-Atlassian-Token:
no-check`) that Stage 2 didn't need. A fourth outcome, `duplicate-suspected` (`--of=ZED-N --reason=...`), records a
      duplicate the agent confirmed by meaning after reading triage's keyword candidates; it reuses the
      `duplicate-suspected` label and the comment quotes the original's title. The Jira client (`jira()`, ADF
      helpers, `addLabel`, `postComment`) is shared in `scripts/jira-common.mjs`; issue keys in comments become links
- [x] "Not reproduced" never becomes "not a bug" automatically — routes to `needs-manual-repro` — `not-reproduced`
      maps directly to the `needs-manual-repro` label in `OUTCOME_LABELS`, never to a standalone "confirmed not a
      bug" state; the script never touches `status`, same rule as Stage 2

**Verified end-to-end on real data 2026-09-29 (ZED-2):** reconstructed steps from ZED-2's description ("open a
wallpaper detail page on mobile, tap Download, an ad interstitial covers the button and can't be dismissed"),
ran them for real via Playwright MCP at a 390x844 viewport against `zedge.net`. First attempt picked a wallpaper
that turned out to carry a price ("10" credits, not actually free) and hit an unrelated "Unlock and Support the
Artist" dialog — corrected by re-picking via the Price=Free filter, same definition of "Free" the test suite
already uses (`WallpapersListPage.cardsFree`). On a confirmed-free wallpaper: tapping Download did show an ad
interstitial ("Preparing your download", AD placeholder, 6s countdown) matching the reported symptom, but it
auto-dismissed on its own and the download completed successfully - not reproduced as "blocks and can't be
dismissed." Recorded via `scripts/jira-repro.mjs`: outcome `not-reproduced`, two screenshots uploaded as real
Jira attachments, labeled `needs-manual-repro` (not treated as "not a bug" - this suite only emulates a mobile
_viewport size_ in desktop Chromium, not a real mobile OS/browser/ad SDK, so a real device could still genuinely
differ; this is exactly the Stage 3 "known gap" below, now hit in practice rather than just anticipated).
Confirmed via a direct Jira API read afterward (label present, status untouched at `To Do`), not just the CLI's
own output.

**Output of this stage:** a ticket that reaches a human already has an attempted repro with evidence attached,
cutting the manual reproduction step most of the time.

### Stage 4 — New tests + fixes, using existing POM/skills

- [x] Confirmed-reproduced bugs first go through `playwright-test-planner` to turn the ticket into a concrete
      scoped test plan (steps + expectations), before any code is written — done for real on ZED-3 (see below);
      the planner's output was later superseded/merged (see next bullet), but the planning step itself happened
      before any test code was written, as required
- [x] Regression test written, reusing existing POM (search-before-write, no duplicate locators/helpers),
      following `playwright-best-practices`. ZED-3's fix (WP-29, correcting an existing mis-scoped test in
      place) was written directly via Edit rather than through `playwright-test-generator` - that gap is now
      closed for real on WP-35 (see below): `playwright-test-planner` scoped a genuinely new test-plan item
      (the narrow-viewport "Filters" panel) against the live site, `playwright-test-generator` then wrote it.
      The generator's own session had two real tool-access limits - no viewport-resize capability, and no
      write access to `pages/WallpapersListPage.ts` - so it wrote plausible-but-unverified selectors as inline
      `TODO(pom)` locators and reported this honestly rather than claiming a false pass. Reviewed by hand
      against a live run: 3 of ~11 assertions needed a real fix (the panel's dialog has no accessible name
      bound to its heading, so `getByRole('dialog', { name })` needs to drop the name and match on the heading
      instead; `getByText` missed a button whose accessible name didn't match its raw DOM text, fixed via
      `getByRole('button', { name })`; and the plan's assumption that a "Reset All" control appears next to the
      chip at narrow width turned out to be wrong - it doesn't, only "Clear all" inside the panel does - the
      test and `specs/wallpapers.plan.md` were corrected to assert the actual behavior instead). Locators moved
      from inline `TODO(pom)` into `WallpapersListPage.ts` afterward per this repo's own convention. Confirmed
      passing 4/4 runs (`--repeat-each=3` plus the original run) against production, lints clean, no regression
      on the existing `wallpapers-filters.spec.ts` suite
- [x] New/failing test always tagged with the Jira ticket ID for traceability — landed on `@BUG:ZED-<n>` (not
      plain `@ZED-<n>`) specifically for tests that encode a _known bug_, enforced via a regex in `src/utils/tags.ts`
      (`bug: [/^@BUG:[A-Z]+-\d+$/]`) that `eslint.config.js` picks up automatically through `Object.values(tags).flat()` - the old literal `@bug` tag (used by the pre-existing WP-29/WP-33) is now invalid on purpose, not an
      oversight. Applied for real: WP-29 → `@BUG:ZED-3`, WP-33 → `@BUG:ZED-4` (ZED-4 filed and repro-confirmed
      alongside ZED-3, once retagging WP-33 required a real ticket to retag it to)
- [x] Failing/flaky existing tests triaged via `playwright-test-healer` to root-cause before proposing a fix:
      real regression vs. flake vs. stale locator — this distinction is a labeled decision, not silently
      auto-fixed away. Done for real on the one flaky test Currents' Sep 2026 data showed (14.3% flakiness,
      1/7 runs, `wallpapers/wallpapers.spec.ts` "allows users to search wallpapers by keywords"). Root cause:
      `WallpapersListPage.waitForCardsToUpdate` had a hardcoded `{ timeout: 5000 }` poll — the one place in the
      codebase not using the CI-aware `TIMEOUTS` constant, called 9x per test run under `workers: 3` against a
      live production search API. Labeled **flake** (timing/concurrency, not a regression, not a stale locator) —
      confirmed with the human before fixing, per the validation gate; fix applied (`TIMEOUTS.expect` instead of
      the literal `5000`), lints clean, test re-run green
- [x] Fix + test go into a PR; agent never merges — formalized flow: agent works on a feature branch
      (`fix/<ticket>-<slug>` or `test/<ticket>-<slug>`), never commits without being asked (per this repo's
      CLAUDE.md), and once the human approves the diff and asks for a commit, opens a PR via `gh pr create`
      against `main` instead of pushing directly to it — CI's existing `pull_request` trigger
      (`.github/workflows/ci.yml`) then gates it. The human merges; the agent never does. ZED-3/ZED-4 and the
      flaky-test fix predate this convention and were committed straight to `main` (already merged, not
      retroactively redone) — this flow applies from here on

**Verified end-to-end on real data 2026-09-29 (ZED-3, ZED-4):** filed ZED-3 for a real, live-confirmed bug (two
Premium/price-10 wallpapers showing different primary buttons), triaged and repro-confirmed it through Stages
2-3, then found via `playwright-test-planner` that it duplicates an existing test (WP-29) built on a now-falsified
assumption. Corrected WP-29 in place instead of adding a redundant test, fixed the wrong "verified fact" in
`specs/wallpapers.plan.md`, and along the way discovered the new `@BUG:` tag convention broke two pre-existing
tests (WP-29, WP-33) still using the old plain `@bug` tag - filed ZED-4 for WP-33's separate accessibility bug
(also repro-confirmed with real evidence) so it could be retagged too, rather than quietly weakening the lint
rule to keep them passing.

**Closed the `playwright-test-generator` gap (WP-35, 2026-09-29):** with no confirmed-reproduced bug left
pending, checked `specs/wallpapers.plan.md` coverage against actual test files and found no genuine backlog
item - every WP-XX was already implemented. Rather than manufacture a fake gap, asked and got a real one from
the user: the "Filters" chip/side-panel that replaces the inline filter bar at reduced viewport widths.
`playwright-test-planner` explored it live and wrote the plan (merged into `specs/wallpapers.plan.md` as WP-35,
not left as a standalone file); `playwright-test-generator` then wrote the test in a separate session that hit
two real tool limits (no viewport resize, no POM write access) and correctly flagged its own selectors as
unverified rather than claiming false success. Manually verified against production, fixed the resulting three
selector/assumption mismatches, and moved the locators into `WallpapersListPage.ts`.

Ahead of that, also did ordinary housekeeping (not agent-skill work): moved WP-02/WP-07/WP-28 out of the legacy
`wallpapers.spec.ts` into the `WP-XX`-named files the rest of the suite already uses, then deleted the
now-empty file. Caught a real bug in the move itself - WP-28 silently passed in 219ms because the move dropped
an implicit page-open the old file's `beforeEach` provided - fixed before it could land as a false-positive test.

**Output of this stage:** every confirmed bug gets a permanent regression test, and every fix is traceable
ticket → test → PR.

### Stage 5 — Review, feedback, and closing the loop back into the system

- [x] Before requesting human review, agent self-runs new/changed tests a **fixed, capped number of times**
      (default: 3 — an arbitrary but reasonable starting point, not a derived number: 1 run tells you nothing
      about flakiness, 2 barely more, 3 gives a minimal majority signal — e.g. 2/3 pass flags real instability —
      while keeping the cost multiplier low for e2e browser tests, which aren't cheap to repeat. Not tied to
      "locally" specifically — this applies wherever the agent runs the tests, CI or local. Use Playwright's
      built-in `--repeat-each=3` rather than a custom retry loop. Revisit the number once real flake-rate data
      exists from Stage 1's Currents.dev history) to catch obvious flakiness — not open-ended "N", to avoid
      runaway time/token/CI-minute cost. If still inconsistent after the cap, label `flaky-unconfirmed` and hand
      to a human rather than retrying further. Built as `npm run verify` (`scripts/verify-changed.mjs`): runs the
      specs changed vs `main`, in the working tree or untracked (or `--files=`) with `--repeat-each=3`, prints
      passed/runs per test (stable / FLAKY / FAILING), exits non-zero unless everything is stable, and with
      a flaky test tagged `@BUG:<KEY>` gets that ticket labeled `flaky-unconfirmed` automatically (taken from the tag, nothing to pass by hand). Verified on real specs (all 3/3); the flaky
      branch and the label call have not been exercised on a genuinely flaky test yet
- [ ] ~~PR description auto-includes: repro steps used, what changed, why, related tests that could be affected~~
      — dropped: a generator was built and removed again, it only repeated what the Jira ticket already says
      (the reviewer opens the ticket anyway); the one thing the ticket lacks, the tests tagged `@BUG:<KEY>`,
      is not worth a script - a PR description written by hand covers it
- [~] Reviewer corrections (e.g. "don't use waitForTimeout, use our helper") get captured back into
  `CLAUDE.md`/skills, not re-litigated on the next PR — happening in practice (commit-message rules,
  headless-only, no destructuring of `app`), but by hand; no mechanism beyond "the agent adds it to
  `CLAUDE.md`/memory when told"
- [x] No custom dashboard: the ready-made Currents.dev dashboard covers runs, flaky tests and history

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

| Variable              | Used in            | Notes                                                                                                                                                                                                                                                                                                                                | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CURRENTS_RECORD_KEY` | Stage 1            | Secret — kept only in `.env` locally and as a **GitHub Actions secret** for CI; never in `currents.config.ts` (project ID `OOKVTP` is hardcoded there instead, per Currents' own convention, since it isn't sensitive)                                                                                                               | local: done, CI secret: **needs manual setup in GitHub repo settings**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `CURRENTS_API_KEY`    | Stage 4+           | **Different key from `CURRENTS_RECORD_KEY`** — used by `@currents/mcp` (agent tool access) and the native Jira integration. Needs Read & Write permission for Jira write operations (creating/linking issues); Read Only suffices for querying flakiness/failure data. Lives in the project `.env` (gitignored)                      | **Working (updated 2026-09-29):** `@currents/mcp` is pinned in `devDependencies` and started from `node_modules` with `node --env-file-if-exists=.env` in `.mcp.json`, so the key comes from `.env`; verified by starting the server with the key removed from the process env and calling `currents-get-projects`. The earlier `launchctl setenv` workaround (2026-09-28, when `.mcp.json` used `${CURRENTS_API_KEY}`, which only expands from the real OS env) is no longer needed. **Local/interactive-session use only** — CI never needs this (CI only uses `CURRENTS_RECORD_KEY` for the reporter). When Stage 2+ eventually runs the agent autonomously, this key will need to live in whatever secret store that runner uses — open question |
| `JIRA_BASE_URL`       | Stage 2+           | `https://domovou69.atlassian.net`. Read by `.github/workflows/jira-triage.yml` from `vars.JIRA_BASE_URL`                                                                                                                                                                                                                             | local: done, **CI var: needs manual setup** (Settings → Secrets and variables → Actions → Variables)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `JIRA_PROJECT`        | Stage 2+           | `ZED`. Read by the workflow from `vars.JIRA_PROJECT`                                                                                                                                                                                                                                                                                 | local: done, **CI var: needs manual setup**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `JIRA_API_TOKEN`      | Stage 2+           | Personal account token, not a dedicated service account — see note below. **Trigger strategy changed to `workflow_dispatch`/manual** (see Stage 2) — this means the CI job itself now calls Jira, so this needs to become a **GitHub Actions secret** too, not just local `.env`. Read by the workflow from `secrets.JIRA_API_TOKEN` | local: done, **CI secret: needs manual setup**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `JIRA_EMAIL`          | Stage 2+           | Atlassian account email the token belongs to (Jira Cloud auth is email+token, not token alone). Read by the workflow from `vars.JIRA_EMAIL`                                                                                                                                                                                          | local: done, **CI var: needs manual setup**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `BASE_URL`            | Stage 3 + existing | `https://www.zedge.net/`, hardcoded as the default in `playwright.config.ts` (env override still possible, but no longer required in CI — removed from `.github/workflows/ci.yml`). Doubles as the Stage 3 repro target since no staging exists                                                                                      | done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

No staging environment exists for Zedge — resolved by using production directly for repro (see Stage 3), under
the same guest-only/no-destructive-action constraints the test suite already follows elsewhere in this repo.

**Personal token + comment marker:** `JIRA_API_TOKEN`/`JIRA_EMAIL` are your own personal Atlassian credentials,
not a service account — automated comments post under your name. Mitigated by prefixing every automated comment
with `[agent - Claude]` (see Stage 2) so it's visually unmistakable in the ticket history which
comments were you and which were the agent, without needing a separate service account.

## Status

- [x] Stage 1: Currents.dev wired in and verified end-to-end (local + CI); plan terms checked: trial only, no free plan (see Stage 1)
- [x] Stage 2: Jira triage script built and verified end-to-end on real data (real CI run, real ticket, real
      write path, idempotency confirmed)
- [x] Stage 3: reproduction flow (production, no staging) — mechanism built and verified end-to-end on three real
      tickets (ZED-2: not-reproduced/needs-manual-repro; ZED-3, ZED-4: reproduced/repro-confirmed, both with real
      evidence attached). Interactive-only by design (see Stage 3's architectural-gap note), not a gap in itself
- [x] Stage 4: test/fix generation via existing skills — planner and healer both run for real (WP-29 corrected
      and retagged `@BUG:ZED-3`, WP-33 retagged `@BUG:ZED-4`, the one real flaky test from Currents' Sep 2026 data
      root-caused and fixed, WP-35 planned and generated end-to-end via `playwright-test-planner` +
      `playwright-test-generator`), all lint-clean and passing against production; PR flow formalized (branch →
      `gh pr create` → human merges) for work going forward
- [~] Stage 5: review/feedback loop — self-check (`npm run verify`) built and verified; reviewer feedback capture is manual; no custom dashboard, the ready-made Currents.dev one is used
