# TKT-4 Wallpapers: Filter combinations and detail page

Type: Subtask | Status: In Progress | Labels: impl-ready-for-review | Parent: TKT-1


## Scenarios
- WP-13 [P2], WP-14 [P2], WP-15 [P3], WP-16 [P2], WP-17 [P3], WP-18 [P3] (all @regression)

## Files
- Tests: tests/wallpapers/wallpapers-filters.spec.ts, wallpaper-detail.spec.ts
- Page objects: WallpaperDetailPage

## Branch
<KEY>-filter-combos-detail (the key of this Subtask)

## Done when
- The raw commit exists on the branch; the npm run verify report is in the ticket comments; the PR is open for review.

## Comment 2026-10-08T11:34:50.272Z

Raw commit: 56e01fc3. Branch TKT-4-filter-combos-detail (no remote in this run: no push, no PR; reviewed locally with git diff main...HEAD).
verify (3 runs each): all 24 filters/detail tests 3/3 stable, incl. WP-13 (3 pairs), WP-14, WP-15, WP-16, WP-17, WP-18.
plan-coverage: WP-13..WP-18 implemented, none missing, 33/33 tests matched; WP-19..25 missing belong to other groups.
Reused: CardGrid, CardLinkValidator, FiltersBar, FilterDrawer, WallpapersListPage, HeaderPage. Added: pages/WallpaperDetailPage.ts (app.wallpaperDetailPage); CardGrid firstWithoutCrown/open/openFirst/validateNotLinkedTo and atMost in validatePriced; FiltersBar.applyPriceRange; FilterDrawer.priceInput/validatePriceValue; WallpapersListPage.validateKeywordSearch.
Self-review: no findings (lint 0 errors, tsc clean; format:check flags only pre-existing .mcp.json and CLAUDE.md). The playwright-test-generator agent was not used: tests written directly from a live DOM probe.
Bugs: none found; plan bug candidates 2/3 avoided by design (WP-14 sets both bounds, no Paid+range).
