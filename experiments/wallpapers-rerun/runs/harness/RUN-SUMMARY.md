# Run summary: Wallpapers guest E2E coverage (WPR-1)

Section: zedge.net/wallpapers, guest only, against production. Plan: `specs/wallpapers.plan.md`. Tests: `tests/wallpapers/` (8 files, 39 tests).

## What is covered

`scripts/plan-coverage.mjs`: 25 scenarios planned, 23 implemented, 2 missing on purpose (WP-22, WP-24). All 7 P1 and all 6 P3 scenarios are covered. All 39 listed tests match a plan scenario, with no tag mismatch.

| Subtask | Scenarios | Tests |
| --- | --- | --- |
| WPR-2 List, search, scroll | WP-01 to WP-06 | `wallpapers-list`, `wallpapers-search`, `wallpapers-scroll` |
| WPR-3 Category navigation, core filters | WP-07 to WP-12 | `wallpapers-category-nav`, `wallpapers-filters` (18 tests) |
| WPR-4 Filter combinations, detail page | WP-13 to WP-18 | `wallpapers-filters`, `wallpaper-detail` |
| WPR-5 Share, download, purchase gate, 404 | WP-19, WP-20, WP-21, WP-23, WP-25 | `wallpaper-detail`, `wallpapers-download`, `wallpapers-purchase` |

- Tags: `@wallpapers` and `@guest` are on each `describe`. `@smoke` marks the 7 P1 scenarios. `@regression` marks the rest. `@download` is on WP-20, which checks that a free wallpaper really downloads (JPEG, not empty, magic bytes `ff d8 ff`).
- Tests assert invariants only, because the content is live. They check no titles and no exact counts. Free and premium items are picked at run time from the first matching card.
- New page objects in `pages/`: `AppPageObjects`, `WallpapersListPage`, `FiltersBar`, `FilterDrawer`, `CardGrid`, `CardLinkValidator`, `ExploreCategories`, `CategoryPage`, `WallpaperDetailPage`, `DownloadFlow`, `NotFoundPage`.
- Shared components: `HeaderPage`, `FooterPage`, `MainHeaderPage` and `BuyModalPage`. They take parameters (href prefix, scope names) so ringtones and notification sounds can reuse them.
- Per the subtask comments, each subtask's tests were 3/3 stable under `npm run verify`. Lint and `tsc` were clean. `format:check` flagged only `.mcp.json` and `CLAUDE.md`, which this work did not touch. I did not re-run any tests while writing this summary.

## Skipped, and why

- **WP-22** (premium item priced 10 shows Download instead of Buy): a bug candidate. It is out of scope for the Story and is not filed.
- **WP-24** (premium item without a price downloads like a free one): a bug candidate. It depends on live data, and there is no way to find the item without a conditional in the test. It stays a note in the plan.
- **Plan bug candidates 3, 5, 6, 7, 8, 9 and 10**: no tickets were filed for them and there are no tests. The Story allows a test only after a ticket is approved. These items are in "Bug candidates" in the plan:
  - `minPrice` is ignored with `paid=true`.
  - Malformed query values return HTTP 500.
  - Reset All keeps the keyword.
  - DialogTitle console error.
  - Missing accessible names.
  - Absurd prices.
  - The header scope chip reads "All".
- **Avoided by design**: WP-14 sets both price bounds and does not combine Paid with a range, so it does not hit candidates 2 and 3. WP-10 does not start from a keyword search.
- **Out of scope for the Story**: ringtones, notification sounds, artists search, `/profiles`, Live Wallpapers, the AI maker, header Upload / Sign in / credits, "Download app" and "AD" tiles, narrow viewport, and audio preview.
- **Not asserted**, because they depend on an A/B variant: the countdown value, "Downloads left today" and "Get the App".

## Bugs filed

- **WPR-6**: on `/wallpapers`, entering only "From" in the Price filter gives `?minPrice=11&maxPrice=NaN`. It reproduced headless on production, twice. Evidence is in `tickets/evidence/WPR-6/nan.png`. Its status is To Do, with label `repro-confirmed`.

## Open items to review

- **WPR-6 has no `@BUG:WPR-6` test.** The WPR-3 comment says the test would go with WP-14 in WPR-4. WP-14 deliberately sets both bounds, and `grep` finds no `@BUG` or `NaN` in `tests/`. The bug has a ticket but no green-on-current-behavior guard. If you want one, add it as a separate test with an `{ type: 'bug', description }` annotation.
- **Ticket statuses.** `tickets/tickets.json` still shows WPR-2 to WPR-5 as `In Progress` with label `impl-ready-for-review`, and WPR-1 as `To Do`. The git history shows all four squash-merged to `main`. The `Done` transitions were not applied, so I did not claim them.
- **Local branches.** `WPR-2-list-search-scroll`, `WPR-3-category-filters`, `WPR-4-filter-combos-detail` and `WPR-5-share-download-purchase` still exist locally. There was no remote and no PR in this run.
- **Flake risk**: in multi-select, a second click before the first applies drops the first selection. The tests wait for each selection to apply. It was seen live and not filed, because it needs a human-speed repro.
- **Lint warning**: `waitForTimeout` in `src/utils/helper.ts` is an existing warning.

## How to run

```sh
npm test                                          # everything (39 tests)
npm run test:smoke                                # @smoke, the P1 scenarios (runs on every PR)
npm run test:download                             # @download, WP-20
npx playwright test --grep @wallpapers            # the whole area
npx playwright test tests/wallpapers/wallpapers-filters.spec.ts
npm run verify                                    # repeat changed tests and report stable / flaky / failing
npm run lint && npx tsc --noEmit && npm run format:check
node scripts/plan-coverage.mjs                    # plan vs tests
npm run trace -- <test-results-dir>               # open a trace
```

Run headless only. The tests hit production, so a failure can come from live content. Check the trace before changing a test.
