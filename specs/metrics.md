# AI-assisted test automation: metrics

## Baseline (manual, before the AI pipeline)

| Section    | Tests | Test cases (README) | Stability          |
| ---------- | ----- | ------------------- | ------------------ |
| Wallpapers | 4     | TC-01..TC-11        | 4/4 passing on run |

## Conventions

- **Stability check: single run, not `--repeat-each=5`.** A generated test runs once. If it fails, that's a bug -
  either in the site (document it, see `@bug` in the plan) or in the test/POM (fix it) - not something to average
  away with repeats. Re-run once after a fix to confirm; don't repeat "just in case". (Superseded: earlier entries
  below still show a `--repeat-each=5` run from before this convention was adopted.)
- Commit granularity: test file(s) + the POM changes they needed + the matching `metrics.md` log line go in the
  same commit, not metrics-after. Commits are proposed as ready-to-paste blocks per `CLAUDE.md`; never run without
  being asked.

## Pipeline log

| Date             | Stage                                                                                                                                                                                                                                                                                                                                                       | Tool / agent                                   | Duration | Output                                                                               | Human review notes                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-26 21:33 | Seed, fixtures, agent project rules                                                                                                                                                                                                                                                                                                                         | Claude Code (main)                             |          | seed + rules for planner/gen/healer                                                  |                                                                                                                               |
| 2026-09-26 21:34 | Test plan: wallpapers                                                                                                                                                                                                                                                                                                                                       | playwright-test-planner                        | 8 min    | 32 scenarios (10 covered, 22 new)                                                    | see v2                                                                                                                        |
| 2026-09-26 22:25 | Plan review v2 + live fact check                                                                                                                                                                                                                                                                                                                            | Human + Claude (MCP)                           |          | 23 scenarios, 2 `@bug`                                                               | 9 removed/merged                                                                                                              |
| 2026-09-26 22:46 | Implementation notes: `SortByType` (+Price Low/High), `WallpaperCategoryType` (+Holidays, Designs), `tags.ts` `@regresion`→`@regression` + `@bug`                                                                                                                                                                                                           | Claude Code (main)                             | 1 min    | src/types/types.ts, src/utils/tags.ts edited, tsc/prettier clean                     |                                                                                                                               |
| 2026-09-26 22:51 | Generate WP-10 (Category Navigation)                                                                                                                                                                                                                                                                                                                        | playwright-test-generator                      | 4 min    | tests/wallpappers/wallpapers-category-nav.spec.ts                                    | 2 TODO(pom): categoriesDialog, categoryFilterDialog                                                                           |
| 2026-09-26 22:56 | Generate WP-19 (filters, data-driven, 6 rows)                                                                                                                                                                                                                                                                                                               | playwright-test-generator                      | 5 min    | tests/wallpappers/wallpapers-filters.spec.ts                                         | no TODO(pom); found live URL params (tags=, colors=, free=true, paid=true - plan said minPrice for Paid, actual is paid=true) |
| 2026-09-26 23:00 | Generate WP-18 (Reset All), appended to same describe                                                                                                                                                                                                                                                                                                       | playwright-test-generator                      | 4 min    | tests/wallpappers/wallpapers-filters.spec.ts                                         | no TODO(pom)                                                                                                                  |
| 2026-09-26 23:05 | Generate WP-30 (premium purchase gate, 2 variants)                                                                                                                                                                                                                                                                                                          | playwright-test-generator                      | 5 min    | tests/wallpappers/wallpapers-purchase.spec.ts                                        | 7 TODO(pom); confirmed live `buyBtn.nth(1)` is correct (nth(0) is a hidden 0x0 duplicate)                                     |
| 2026-09-26 23:15 | POM pass: moved all 9 TODO(pom) into pages/ (HeaderPage.categoriesDialog, WallpapersListPage.categoryFilterDialog/isCategorySelected/getCardPriceBadgeText, WallpaperDetailPage.premiumBadge/priceText, BuyModalPage.creditsPackageBtn/loginLink/cancelBtn/purchaseTitle/validatePurchaseModalDialog/clickCancel), updated the 3 new spec files to use them | Claude Code (main)                             | 15 min   | tsc --noEmit clean, eslint 0 errors (11 pre-existing/minor warnings), prettier clean |                                                                                                                               |
| 2026-09-26 23:08 | First `--repeat-each=5` run (WP-10, WP-19x6, WP-18, WP-30x2)                                                                                                                                                                                                                                                                                                | Claude Code (main)                             | 4.5 min  | 35 passed, 15 failed                                                                 | 2 pre-existing page-object bugs found (below), not flakiness                                                                  |
| 2026-09-26 23:20 | Root-caused and fixed both failures                                                                                                                                                                                                                                                                                                                         | Claude Code (main)                             | 12 min   | see fixes below                                                                      |                                                                                                                               |
| 2026-09-26 23:36 | Generate WP-01 (List Page header/filter-bar/cards), POM pass (`cardHasPriceBadge`), single run                                                                                                                                                                                                                                                              | playwright-test-generator + Claude Code (main) | 20 min   | tests/wallpappers/wallpapers-list.spec.ts                                            | 1/1 passing; 2 live findings, resolved below (23:45)                                                                          |
| 2026-09-26 23:45 | Human review of the 2 findings; added `cardsAiGenerated` locator                                                                                                                                                                                                                                                                                            | Human + Claude Code (main)                     | 5 min    | pages/WallpapersListPage.ts edited, tsc/eslint/prettier clean                        | 1 fixed as a locator gap, 1 withdrawn (not a bug)                                                                             |

**Bugs found by the new tests (pre-existing in `pages/`, not introduced by this pass):**

1. `HeaderPage.selectCategory` asserted `page.url()` synchronously right after `click()`, racing the client-side navigation — flaky (failed on WP-10, all 5/5 repeats once it lost the race). Fixed: replaced with `await expect(this.page).toHaveURL(...)` (web-first, retries).
2. `WallpaperDetailPage` had no `priceText`; the naive `page.getByText(price, { exact: true })` hits a strict-mode violation because the detail page renders its own price badge **twice** (mobile/desktop duplicate) — the same pattern already known for `buyBtn.nth(1)`, just not documented for the price badge. Fixed: `priceText(price)` now ends in `.last()`, mirroring the `buyBtn` convention, with a comment pointing at the shared cause.

**Live findings from WP-01, human review (2026-09-26 23:45):**

3. `WallpapersListPage.cardsPremium` (`cardsAll.filter({ has: 'div[class*="card-header"]' })`) was over-broad: cards with an "AI generated" badge also render a `card-header` div and got misclassified as premium. Fixed: added a separate `cardsAiGenerated` locator (`svg[aria-label="AI generated"]` inside `card-header`), so the two badge kinds can be told apart and checked independently instead of conflating them in one filter. Not independently re-verified live this session (no AI-generated card appeared in this catalog snapshot) - selector is based on the generator subagent's direct observation; confirm next time one is visible. `cardsPremium` itself is still unused anywhere in the suite.
4. Not a bug (human call): a crown/premium badge with no price badge (e.g. the "Halloween" wallpaper) just means "has no price", not "misconfigured gate" - free wallpapers can carry the crown badge too, it isn't an exclusive paid-item marker. Withdrawn; no `@bug` scenario needed.

**CI-only failure (2026-09-26, GitHub Actions run), not reproducible locally:**

5. WP-10 and both WP-30 variants failed on CI (passed locally): the Didomi cookie banner appeared _after_ a Radix dialog (Categories/Price) was already open, and the existing `rejectCookieConsent` auto fixture (`addLocatorHandler` in `fixtures/test.ts`) - a persistent, reactive handler that fires before the next action whenever the reject button becomes visible - clicked reject at that point, which lands as a click outside the open dialog and closes it (Radix's outside-click-to-close). The fix isn't "detect it faster/differently" (a plain event listener has the identical side effect, whenever it fires while a dialog is open) - it's "resolve it before any dialog can exist". Added `dismissCookieBanner(page)` in `src/utils/helper.ts`, called once from `WallpapersListPage.open()` right after `page.goto`, before any filter/category interaction; the existing fixture handler stays as a safety net for a banner appearing later than that. Considered pre-seeding the `didomi_dcs` consent cookie/localStorage before navigation (would skip the banner entirely) but rejected it: the value is an opaque, likely session/region-tied blob - hardcoding it risks silent expiry/breakage and is harder to maintain than a bounded wait-and-click. Verified locally: 3/3 passing (13-16s each, confirming the wait actually engages).

## Result per section

| Section    | Scenarios planned | Tests generated                                                            | Accepted after review | Stability (single run) | Total time  |
| ---------- | ----------------- | -------------------------------------------------------------------------- | --------------------- | ---------------------- | ----------- |
| Wallpapers | 23                | 5 scenarios (WP-01, WP-10, WP-19x6, WP-18, WP-30x2 = 10 test cases so far) |                       | 10/10 passing          | in progress |

## Roadmap

1. Wallpapers: generate P1 (WP-10, WP-18, WP-19, WP-30), move `TODO(pom)` into `pages/`, confirm a clean single
   run, then P2 and P3 - one scenario (or one data-driven file) at a time: generate → POM pass → single run →
   commit (test + POM + metrics together).
2. Remove the replaced chained filter test and TC-11 from `tests/wallpappers/wallpapers.spec.ts`.
3. Tool comparison: Explorbot vs this pipeline on the same section (below).
4. Ringtones: same pipeline.

## Tool comparison: Tool 1 (this pipeline) vs Tool 2 (Explorbot)

Run Tool 2 after the wallpapers suite is finished with Tool 1, so both results cover the same scope.

### Common scope (identical for both tools)

- Site: zedge.net, section `/wallpapers` (list, search, category navigation, filters, scroll and "Load more", detail
  page, free download, premium purchase gate).
- Guest user only: no sign-in, purchase or upload; flows stop at the sign-in or purchase dialog.
- Desktop viewport only, Chromium.
- Live production site: one session, one action at a time.
- Out of scope: ringtones, security testing (XSS, SQL injection), load and performance testing.

### Toolsets

| Component       | Tool 1: this pipeline                                                                                                                                                       | Tool 2: Explorbot                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Orchestration   | Claude Code 2.1.283 (VS Code extension), main session model: Sonnet 5 until plan v1, Opus 5.5 from plan v2                                                                  | [Explorbot](https://github.com/testomatio/explorbot) (testomat.io, by DavertMik), version at run time                                         |
| Agents          | Playwright 1.63 Test Agents: `playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer` (model: Sonnet), browser via the `playwright-test` MCP server | Built-in crew: research, plan, execute, verify                                                                                                |
| Knowledge       | Skills: `playwright-best-practices` (currents-dev @283d5cb, project), `systematic-debugging` (obra/superpowers @8ca22db, global); project rules in `.claude/agents/*.md`    | Built-in prompts; learned "experience" between runs                                                                                           |
| Models          | Claude (Sonnet for agents, Opus/Sonnet for the main session)                                                                                                                | Defaults from its `models.json`: OpenRouter `openai/gpt-oss-20b:nitro` (standard), `openai/gpt-5.6-luna` (vision and agentic)                 |
| Browser engine  | Playwright (Chromium)                                                                                                                                                       | Playwright                                                                                                                                    |
| Project context | Reads existing `pages/*.ts`, `fixtures/test.ts`, seed and tests                                                                                                             | None: works from the live UI only                                                                                                             |
| Human in loop   | Plan review, `[CONFIRM]` decisions, code review of generator and healer output                                                                                              | None by design; human reviews the final report                                                                                                |
| Output          | Test plan (`specs/*.plan.md`), Playwright tests on project POM and fixtures                                                                                                 | Report (HTML or Markdown), videos, standalone Playwright or CodeceptJS tests                                                                  |
| Cost model      | Claude subscription (plan: fill in), no per-token charges                                                                                                                   | Pay per token, API key; stated about $1 per hour of continuous run                                                                            |
| Setup           | This repo                                                                                                                                                                   | Separate folder outside this repo; OpenRouter key with $5 balance; default models; time-boxed to 30 minutes; same constraints as Common scope |

### Compare

| Metric                                   | Tool 1: this pipeline                             | Tool 2: Explorbot |
| ---------------------------------------- | ------------------------------------------------- | ----------------- |
| Scenarios produced                       |                                                   |                   |
| Useful scenarios after human review      |                                                   |                   |
| Found: price-10 premium gate bug (WP-29) | planner saw the difference, human called it a bug |                   |
| Found: `maxPrice=NaN` in URL             | human only                                        |                   |
| Found: DialogTitle a11y error (WP-33)    | planner                                           |                   |
| New findings we missed                   |                                                   |                   |
| False positives                          |                                                   |                   |
| Generated tests that run green as-is     |                                                   |                   |
| Uses project POM and fixtures            | yes                                               |                   |
| Human effort to adapt the output         |                                                   |                   |
| Wall-clock time                          |                                                   |                   |
| Money spent                              | subscription                                      |                   |
