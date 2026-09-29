# Review Follow-ups Plan

Result of the project review (2026-09-29): what to fix before showing the repo as an example of skills + MCP + action
automation. Each step is a separate commit, reviewed and committed by the owner. Mark `[x]` when a step is done and
verified; add a line to the progress log.

Verification for every step: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`; for anything touching tests
or the POM also a full headless run (`npm test`) and `npm run verify -- --files=<spec>` (x3).

## Decisions (already made)

- `retries: 0`. Flakes are caught by `npm run verify`, not hidden by retries.
- Tags: `@wallpapers` / `@guest` only on `describe`; tests carry `@smoke` (critical flows) or `@regression` (both is allowed); `@BUG:KEY` and `@download` stay. CI: pull request runs `@smoke`, push to main runs everything.
- Jira triage is a plain script (no LLM). It keeps duplicate search, but on title + description keywords instead of the
  whole title, and says honestly that it is keyword overlap. The semantic verdict stays with the agent session.
- `explorbot-experiment/` is deleted; `specs/explorbot-experiment.plan.md` stays as the case study.
- `scripts/*.mjs` get no unit tests; a shared Jira client replaces the three copies.
- Project conventions move from chat history into `CLAUDE.md`.
- Skill `playwright-best-practices` stays vendored (diffs visible), trimmed to the relevant files. A plugin would not
  change when it triggers (skills load by description match either way). To make it a default: a line in `CLAUDE.md`
  plus `skills:` in the generator/healer agent frontmatter (preloads the full skill into the subagent).
- `force: true` clicks stay until the cookie experiment proves them unnecessary (without them 20 of 34 tests failed).
- Locator quality pass and conditional-logic cleanup in tests are separate later steps, not part of this batch.

## Steps

### 1. Cleanup

- [x] Delete `.prettierrc.json` (`.prettierrc` is the one prettier uses)
- [x] Delete `explorbot-experiment/`; make sure `specs/explorbot-experiment.plan.md` states the outcome (add a few lines if not)
- [x] Delete stale `specs/README.md` (old TC-01.. list, superseded by `wallpapers.plan.md`)
- [x] `git mv tests/wallpappers tests/wallpapers`; update every path (`File:` lines in specs, `verify` usage comment, README, plans)
- [x] Put `scripts/` back under eslint and prettier (remove from `ignores` / `.prettierignore`), fix what they report

### 2. Conventions and skill

- [x] `CLAUDE.md`: add project conventions (no `const { page } = app` destructuring in tests, test IDs never renamed - only
      tags added, bug tests assert current behavior and stay green with `@BUG:KEY`, no per-ticket plan files, POM search-before-write,
      Claude runs tests headless only, no `--issue` flags, avoid needless multi-line comments)
- [x] `CLAUDE.md`: "before writing or editing tests invoke the `playwright-best-practices` skill; project rules above win"
- [x] Add `skills: [playwright-best-practices]` to the generator and healer agent frontmatter
- [x] Trim the skill to ~8 relevant files (locators, assertions-waiting, page-object-model / pom-vs-fixtures, fixtures-hooks,
      flaky-tests, test-tags, annotations, configuration, github-actions); show the list before deleting; fix the index in
      `SKILL.md`, update `.claude/skills/VENDORED.md` (source SHA, "trimmed on <date>, kept: ...")

### 3. README

- [x] Rewrite `README.md`: short and exact - what this is, setup, scripts (`test`, `verify`, `lint`, ...), the loop in 5
      lines, Jira scripts, MCP servers, table of environment variables (`BASE_URL`, `CURRENTS_*`, `JIRA_*`)

### 4. Config

- [x] `playwright.config.ts`: `retries: 0`
- [x] (also update the MCP and environment sections of `README.md`) Add `@currents/mcp` to devDependencies and run it from `node_modules` via `node --env-file=.env ...` in `.mcp.json`;
      move `CURRENTS_API_KEY` from `.claude/settings.local.json` into `.env` if the MCP server starts (otherwise revert and
      keep the key in `settings.local.json`); the `@currents/playwright` caret range stays as is
- [x] Workflows: add `permissions: contents: read` and `concurrency` (cancel superseded runs)

### 5. Jira

- [x] Move the shared client (`jira()`, auth header, `addLabel`, `postComment`, ADF helpers) into `scripts/jira-common.mjs`;
      `jira-triage`, `jira-repro`, `verify-changed` import it
- [x] Smarter duplicate search in `jira-triage.mjs`: keywords from title + description (stop-words and short tokens
      dropped), JQL `text ~ ... OR text ~ ...`, candidates scored locally by shared keywords, only those above a
      threshold are listed (max 5), each with the shared terms as the reason; comment wording says "keyword overlap,
      not confirmed"; triage always sets `needs-repro`, `duplicate-suspected` only comes from `jira-repro`
- [x] `DRY_RUN=1` for triage: prints candidates and the would-be comment, writes nothing (verify on ZED-3..7 without touching Jira)
- [x] `jira-repro.mjs`: outcome `duplicate-suspected` with `--of=ZED-N --reason=...` for duplicates the agent confirms by meaning
- [x] Update the Stage 2 / Stage 3 wording in `specs/agentic-qa-loop.plan.md`

### 6. Tags and CI split

- [x] Propose the `@smoke` list (list page, search, download, purchase gate, filter reset, ...) and get approval
- [x] Retag all specs per the taxonomy above (describe: area + audience; test: one level); update `src/utils/tags.ts`
      and the eslint config; ESLint (`require-tags`, `valid-test-tags`) is the only enforcement: a
      test has tags and only known ones, "exactly one level" is not required (owner's call)
- [x] `ci.yml`: pull request runs `--grep @smoke`, push to main runs everything
- [x] Document the taxonomy in `CLAUDE.md` and `specs/wallpapers.plan.md` conventions

### 7. Cookie banner experiment (time-boxed)

- [ ] Try a Didomi consent cookie via `context.addCookies` / `addInitScript` in the fixture so the banner never appears
- [ ] If the banner is gone: drop the `addLocatorHandler`, `dismissCookieBanner` and the banner wait in `open()`;
      then try removing `force: true` (pages + spec); keep only what is stable in `verify` x3 and a full run
- [ ] If not stable: revert, keep the current three-part mechanism, record the finding here
- [ ] `gotoWallpapersWithRetry`: log the reason for every retry (test annotation)

### 8. Split the POM

- [ ] `WallpapersListPage` (699 lines) into components: `FiltersBar` (desktop filters), `FiltersPanel` (narrow panel),
      `DownloadFlow`; the page keeps cards, search entry and scroll
- [ ] Update call sites in tests (mechanical); no test IDs or titles change
- [ ] Full run + `verify` x3 before and after

## Later (separate steps, not in this batch)

- [ ] Locator quality pass (the agent-written `div[class*="card-footer"]` style selectors)
- [ ] Remove conditional logic from tests (25 lint warnings), then `eslint --max-warnings 0`
- [ ] Currents + Jira dashboard (postponed in the loop plan)

## Progress log

- 2026-09-29: review done, plan written.
- 2026-09-29: step 1 done. Also: `@eslint/js` + `globals` added (scripts linted with the JS recommended set), lint-staged covers `*.mjs`,
  stale TC-xx / `wallpapers.spec.ts` references in the planner/generator agents fixed. Explorbot plan already held the outcome;
  only its closing note was updated.
- 2026-09-29: step 2 done (skill trim later revised, see the next entry). CLAUDE.md has the conventions; skill trimmed 59 -> 19 reference files (kept: locators, assertions-waiting,
  page-object-model, fixtures-hooks, test-suite-structure, test-tags, annotations, configuration, test-data, pom-vs-fixtures,
  flaky-tests, debugging, console-errors, file-upload-download, accessibility, mobile-testing, network-advanced, ci-cd,
  github-actions), SKILL.md index rewritten, dead links removed. `skills:` preload in generator/healer is per the docs but not
  yet observed in a real subagent run - confirm the next time one runs.
- 2026-09-29: skill trim revised: restored the generic references (API, auth, third-party, forms, visual, drag-drop, Docker, sharding,
  reporting, ...). 40 of 59 files kept; `SKILL.md` stays a compact two-table index (26 KB -> 8 KB) so the token saving is kept.
  Subagent `model: sonnet` resolves to Sonnet 5.5 on the Anthropic API per the docs; left as an alias.
- 2026-09-29: step 3 done: README rewritten (setup, commands, layout, loop, Jira scripts, MCP, env table); the old TC-01..TC-11 list is gone.
  Note: the deleted `specs/README.md` was only the Playwright init stub ("This is a directory for test plans"), not a TC list - the TC list lived in the
  root README.
- 2026-09-29: step 4 done. `retries: 0` (full suite 34/34 without retries beforehand). `@currents/mcp` pinned to 2.6.1 in devDependencies, `.mcp.json` runs it
  with `node --env-file-if-exists=.env`; checked by starting the server with `CURRENTS_API_KEY` removed from the process env and calling
  `currents-get-projects` (worked, key came from `.env`). The key was removed from `.claude/settings.local.json` (`.env` already held the same one).
  Workflows got `permissions: contents: read` and `concurrency` (CI cancels superseded PR runs only; triage runs never cancel each other).
  The PR = smoke split waits for step 6.
- 2026-09-29: step 5 done. `scripts/jira-common.mjs` now holds the client (`jira`, `addLabel`, `postComment`, ADF helpers, `requireEnv`,
  `hasJiraEnv`; env read on use, so `verify` works without `JIRA_*`); triage, repro and verify import it. Issue keys of the configured
  project become links in comments. Duplicate search: title + description keywords, OR-ed `text ~` query, local score (title words x2,
  threshold 5, template boilerplate dropped), comment says "keyword overlap, not confirmed". `DRY_RUN=1` (also a `dryRun` checkbox on
  the workflow) checked on ZED-3..7 with nothing written: ZED-6 <-> ZED-7 (sibling "Clear" bugs) and ZED-4 -> ZED-3 flagged, the rest
  `needs-repro`. `jira-repro.mjs --outcome=duplicate-suspected --of --reason` validated (missing args, unknown `--of`, self, misuse on
  other outcomes all fail before any write); a real post was not made. Plan and README wording updated.
- 2026-09-29: step 5 revised after review: keyword overlap gives false positives, so triage no longer sets `duplicate-suspected`; it sets
  `needs-repro` and lists up to 5 "possibly related" tickets. The label now comes only from `jira-repro --outcome=duplicate-suspected`
  after an agent judged by meaning. A model call inside triage (a cheap model, at most 5 pairs) is postponed until triage runs unattended.
- 2026-09-29: step 6 done. `@smoke` = the plan's P1 scenarios as approved: WP-02, 07, 10, 18, 19 (x6), 28, 30 (x2) = 13 of 34 tests; the rest
  `@regression` (the seed test too). Before, almost every test inherited `@smoke` from its describe and often also carried `@regression`.
  Describes carry `@wallpapers @guest`, tests only their level (+ `@download`, `@BUG:KEY`). A test may carry both levels; ESLint
  (`require-tags`, `valid-test-tags`) is the only enforcement. A custom `check-tags` script that required exactly one level was
  added and then removed at the owner's request.
  `ci.yml`: PR runs `--grep @smoke`, push to main runs everything; `test:smoke` npm script added. Test titles unchanged.
