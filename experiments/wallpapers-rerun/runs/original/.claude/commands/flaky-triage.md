---
description: Task F of the loop. Read the failing and flaky tests of the last days from Currents, group them by root cause, re-check them, and file one Jira Task per new cause. Files tickets only; fixing is /fix-test after a gate.
argument-hint: [days, default 7] [--dry-run]
disable-model-invocation: true
model: sonnet
effort: high
allowed-tools: Bash(cat .claude/loop-rules.md) Bash(node scripts/*) Bash(node --env-file-if-exists=.env scripts/*) Bash(gh run *) Bash(gh workflow run flaky-recheck.yml*) Bash(git log*) Bash(git status*) mcp__currents__currents-get-runs mcp__currents__currents-get-run-details mcp__currents__currents-get-context mcp__currents__currents-get-test-results mcp__currents__currents-get-test-evidence mcp__currents__currents-get-tests-signatures mcp__currents__currents-list-affected-tests mcp__currents__currents-link-jira-issue
---

!`cat .claude/loop-rules.md`

# /flaky-triage $ARGUMENTS

**Input:** Currents runs of project `OOKVTP` on `main` for the last N days (default 7). **Output:** one Jira Task per new root
cause (label `flaky`, label `fp-<fingerprint>`), a comment on an existing Task when the cause is already filed, a table in chat.
**Gate after:** `gate: fix flaky <KEY>` from the human, then `/fix-test <test> <KEY>`. This command never edits code, tags or tests.

1. **Collect.** `currents-get-runs` (branch `main`, date range, status FAILED) and every run with a flaky test. For each run,
   `currents-get-context` (run level, `detail: compact`) lists the failed tests with their error. A test counts as a candidate when
   it failed in 2 or more runs in the window, or was flaky (passed on retry) at least once. A one-off failure is reported in
   chat only. Note: with `retries: 0` Currents shows no flaky tests at all, only failures; say so if the flaky list is empty.
2. **Group by cause.** Start from Currents' own error signature (same error text and code frame), then merge groups whose cause
   is the same by meaning (for example two different tests failing in the same shared helper). One group = one cause; list every
   affected test ID with its run count. Do not make one ticket per test.
3. **Fingerprint.** `fp-` plus the first 12 hex of sha1 of: spec file of the failing frame + the first error line with GUIDs,
   numbers and timings removed. The same cause on another day gives the same fingerprint.
4. **Dedupe (idempotent).** Search Jira for an open or recently `Done` Task with that `fp-` label (`jira-triage.mjs` finds related
   tickets; a plain label search is enough). Found open: add a comment with the new counts and run links, nothing else. Found
   `Done` and the failure returned: file a new Task and link it to the old one as a regression. Not found: continue.
5. **Re-check.** Dispatch the workflow (`gh workflow run flaky-recheck.yml -f grep="<IDs joined by |>" -f repeat=5`), wait for
   it (`gh run watch`), then find its Currents run by the ciBuildId prefix `flaky-recheck-` (`currents-get-runs`, `search`).
   Read the pass/fail per repeat. A group that you cannot re-check (workflow missing, or the test is too slow to repeat) is filed
   with "not re-checked" in the description.
6. **Classify, as a hypothesis.** One class per group, with one line of evidence, using the `/fix-test` vocabulary:
   - `race` / `locator` / `oracle` / `isolation`: fails sometimes on CI and on a local headless repeat (`npx playwright test -g "<title>" --repeat-each=10`); the
     trace shows the page was fine and our wait or locator was wrong.
   - `environment`: fails only on CI, several unrelated tests in one run fail together, or the error is a navigation timeout, `ERR_*`, an ad
     overlay or the cookie banner. Passes locally.
   - `site-change` / `data`: fails every run from one date on (not intermittent), passes before it, and the failing state differs from the
     plan's verified facts. Compare the first failing sha with `git log` and the last passing run.
   - A user-visible wrong behaviour that reproduces by hand on production is not a flaky ticket: stop with the bug draft and wait
     for `gate: file bug` (loop rules).
     A failure that is constant (every run since one sha) is a "failing test", not "flaky": say so in the title.
7. **File.** `jira-create.mjs --type=Task --summary="Flaky: <cause in 8 words> (<test IDs>)" --description-file=...` with labels `flaky`
   and `fp-<hash>`. The description: cause and class with evidence, the table (test ID, runs failed / runs total, first seen, last
   seen, re-check result), the first failing sha, the Currents run URLs and the trace and screenshot of **one** unique failure. The
   evidence URLs from `currents-get-test-evidence` are signed and expire, so link the permanent Currents run/test page and name
   the artifacts; attach the files to the ticket only if an attach script exists. Other tests of the same cause are listed by ID only.
   Then `jira-ticket.mjs assign` the human and comment with `--mention`. Optional, only when the human asked for it in this
   message: `currents-link-jira-issue` to link the ticket to the test in Currents.
8. **Stale marks.** Report every test that carries `@FLAKY:<KEY>` while `<KEY>` is `Done` (the fix PR should have removed it).
9. Print the table: cause, class, tests, new / commented / regression, ticket key. Stop. `--dry-run`: print the tickets you would
   file and write nothing to Jira.

Budget: 60 active minutes as in the loop rules; the re-check wait does not count as active time but is capped at 30 minutes.
