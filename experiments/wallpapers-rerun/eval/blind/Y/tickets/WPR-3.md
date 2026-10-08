# TKT-3 Wallpapers: Category navigation and core filters

Type: Subtask | Status: In Progress | Labels: impl-ready-for-review | Parent: TKT-1


## Scenarios
- WP-07 [P1] [@smoke], WP-08 [P2], WP-09 [P1] [@smoke], WP-10 [P1] [@smoke], WP-11 [P2], WP-12 [P2]

## Files
- Tests: tests/wallpapers/wallpapers-category-nav.spec.ts, wallpapers-filters.spec.ts
- Page objects: filtersBar, filterDrawer, Explore block, CategoryPage

## Branch
<KEY>-category-filters (the key of this Subtask)

## Done when
- The raw commit exists on the branch; the npm run verify report is in the ticket comments; the PR is open for review.

## Comment 2026-10-08T11:16:52.364Z

Raw commit: 98ce7c07
PR: none (no remote in this run); local diff reviewed with git diff main...HEAD on branch TKT-3-category-filters
Scenarios: WP-07, WP-08, WP-09 (6 tests), WP-10 (2), WP-11 (3), WP-12 (5): 18 tests.
verify (3 runs each): all 18 stable, 3/3.
plan-coverage: WP-07..WP-12 implemented, none missing, no tag mismatch (WP-13..25 belong to other groups).
lint, tsc clean; format:check only flags .mcp.json and CLAUDE.md, which are unchanged on main.
Reused: HeaderPage (added categories dialog methods), CardGrid (added price/href-diff validators), MainHeaderPage, FiltersBar (extended), WallpapersListPage. Added: FilterDrawer, ExploreCategories, CategoryPage (app.wallpapersCategoryPage, not an entry page).
Self-review: 2 findings fixed in 6a793cd4 and the next commit (unused FilterDrawer.validateOptionsInclude and setMinPrice removed). No other findings.
Notes: WP-12 price rows start from a deep link (/wallpapers?paid=true, ?minPrice=11) to keep rows plain data. Multi-select waits for each selection to apply: a second click before the first lands drops it (seen live; not filed, needs a human-speed repro).
Bug found: TKT-6 (maxPrice=NaN with only From), repro-confirmed headless; its @BUG test goes with WP-14 in TKT-4.
Run went past 60 active minutes (gate: extend pre-approved); the machine was under heavy load.
