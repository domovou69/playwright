# Review Follow-ups Plan

Result of the project review (2026-09-29): what to fix before showing the repo as an example of skills + MCP + action
automation. Each step is a separate commit, reviewed and committed by the owner. Mark `[x]` when a step is done and
verified; add a line to the progress log.

Verification for every step: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`; for anything touching tests
or the POM also a full headless run (`npm test`) and `npm run verify -- --files=<spec>` (x3).

## Decisions (already made)

- `retries: 0`. Flakes are caught by `npm run verify`, not hidden by retries.
- Tags: `@wallpapers` / `@guest` only on `describe`; every test carries exactly one level, `@smoke` (5-7 critical flows)
  or `@regression`; `@BUG:KEY` and `@download` stay. CI: pull request runs `@smoke`, push to main runs everything.
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

- [ ] Delete `.prettierrc.json` (`.prettierrc` is the one prettier uses)
- [ ] Delete `explorbot-experiment/`; make sure `specs/explorbot-experiment.plan.md` states the outcome (add a few lines if not)
- [ ] Delete stale `specs/README.md` (old TC-01.. list, superseded by `wallpapers.plan.md`)
- [ ] `git mv tests/wallpappers tests/wallpapers`; update every path (`File:` lines in specs, `verify` usage comment, README, plans)
- [ ] Put `scripts/` back under eslint and prettier (remove from `ignores` / `.prettierignore`), fix what they report

### 2. Conventions and skill

- [ ] `CLAUDE.md`: add project conventions (no `const { page } = app` destructuring in tests, test IDs never renamed - only
      tags added, bug tests assert current behavior and stay green with `@BUG:KEY`, no per-ticket plan files, POM search-before-write,
      Claude runs tests headless only, no `--issue` flags, avoid needless multi-line comments)
- [ ] `CLAUDE.md`: "before writing or editing tests invoke the `playwright-best-practices` skill; project rules above win"
- [ ] Add `skills: [playwright-best-practices]` to the generator and healer agent frontmatter
- [ ] Trim the skill to ~8 relevant files (locators, assertions-waiting, page-object-model / pom-vs-fixtures, fixtures-hooks,
      flaky-tests, test-tags, annotations, configuration, github-actions); show the list before deleting; fix the index in
      `SKILL.md`, update `.claude/skills/VENDORED.md` (source SHA, "trimmed on <date>, kept: ...")

### 3. README

- [ ] Rewrite `README.md`: short and exact - what this is, setup, scripts (`test`, `verify`, `lint`, ...), the loop in 5
      lines, Jira scripts, MCP servers, table of environment variables (`BASE_URL`, `CURRENTS_*`, `JIRA_*`)

### 4. Config

- [ ] `playwright.config.ts`: `retries: 0`
- [ ] Add `@currents/mcp` to devDependencies and run it from `node_modules` via `node --env-file=.env ...` in `.mcp.json`;
      move `CURRENTS_API_KEY` from `.claude/settings.local.json` into `.env` if the MCP server starts (otherwise revert and
      keep the key in `settings.local.json`); the `@currents/playwright` caret range stays as is
- [ ] Workflows: add `permissions: contents: read` and `concurrency` (cancel superseded runs)

### 5. Jira

- [ ] Move the shared client (`jira()`, auth header, `addLabel`, `postComment`, ADF helpers) into `scripts/jira-common.mjs`;
      `jira-triage`, `jira-repro`, `verify-changed` import it
- [ ] Smarter duplicate search in `jira-triage.mjs`: keywords from title + description (stop-words and short tokens
      dropped), JQL `text ~ ... OR text ~ ...`, candidates scored locally by shared keywords, only those above a
      threshold are listed, each with the shared terms as the reason; comment wording says "keyword overlap, not confirmed"
- [ ] `DRY_RUN=1` for triage: prints candidates and the would-be comment, writes nothing (verify on ZED-3..7 without touching Jira)
- [ ] `jira-repro.mjs`: outcome `duplicate-suspected` with `--of=ZED-N --reason=...` for duplicates the agent confirms by meaning
- [ ] Update the Stage 2 / Stage 3 wording in `specs/agentic-qa-loop.plan.md`

### 6. Tags and CI split

- [ ] Propose the `@smoke` list (list page, search, download, purchase gate, filter reset, ...) and get approval
- [ ] Retag all specs per the taxonomy above (describe: area + audience; test: one level); update `src/utils/tags.ts`
      and the eslint config; check "exactly one level per test" is enforceable with a simple rule, otherwise document it
- [ ] `ci.yml`: pull request runs `--grep @smoke`, push to main runs everything
- [ ] Document the taxonomy in `CLAUDE.md` and `specs/wallpapers.plan.md` conventions

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

- 2026-09-29: review done, plan written; no steps executed yet.
