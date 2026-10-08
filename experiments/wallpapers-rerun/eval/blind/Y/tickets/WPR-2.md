# TKT-2 Wallpapers: List, search and scroll

Type: Subtask | Status: In Progress | Labels: impl-ready-for-review | Parent: TKT-1


## Scenarios
- WP-01 List page loads with header, filter bar and valid cards [P2] [@regression]
- WP-02 Search by single and multi-word keywords [P1] [@smoke]
- WP-03 Search with no matches shows the empty state [P2] [@regression]
- WP-04 Search with the default All scope opens the global results page [P2] [@regression]
- WP-05 Auto-load on scroll preserves previous results [P1] [@smoke]
- WP-06 Load more loads more cards and re-enables auto-loading [P2] [@regression]

## Files
- Tests: tests/wallpapers/wallpapers-list.spec.ts, wallpapers-search.spec.ts, wallpapers-scroll.spec.ts
- Page objects: fixtures/test.ts (app fixture), pages/AppPageObjects.ts, pages/WallpapersListPage.ts, pages/HeaderPage.ts, pages/FooterPage.ts, pages/MainHeaderPage.ts, pages/CardLinkValidator.ts, pages/CardsComponent.ts

## Branch
<KEY>-list-search-scroll (the key of this Subtask)

## Done when
- The raw commit exists on the branch; the npm run verify report is in the ticket comments; the PR is open for review.

## Comment 2026-10-08T10:01:56.990Z

Raw commit: 29c50f0 (branch TKT-2-list-search-scroll)
PR: none (no remote in this run; push and gh pr create skipped)

verify (3 runs each): all stable
- 3/3 stable WP-01 List page loads with header, filter bar and valid cards
- 3/3 stable WP-02 ... (Wallpapers scope): dragon
- 3/3 stable WP-02 ... (Wallpapers scope): dark forest
- 3/3 stable WP-03 Search with no matches shows the empty state
- 3/3 stable WP-04 Search with the default "All" scope opens the global results page
- 3/3 stable WP-05 Auto-load on scroll preserves previous results
- 3/3 stable WP-06 "Load more" loads more cards and re-enables auto-loading

plan-coverage: WP-01..WP-06 implemented, no tag mismatch, 7 of 7 tests matched to a scenario. The rest of the plan is the other groups.
lint: 0 errors (1 existing warning, waitForTimeout in src/utils/helper.ts). tsc clean. format:check: clean for my files; CLAUDE.md and .mcp.json were already unformatted and are untouched.

Reused: fixtures/test.ts (rejectCookieConsent, blockAds), dismissCookieBanner, hasUniqueValues, TIMEOUTS area.
Added in pages/ (flat, per Areas table): AppPageObjects, WallpapersListPage (open, validateUrl, validateNoResults), HeaderPage (shared, scope-parameterised), FooterPage, MainHeaderPage, FiltersBar (default-state only; group 2 extends it), CardGrid (href-prefix parameter, settled count, scroll, Load more), CardLinkValidator (shared card checks incl. price/crown invariant). Also: `app` fixture in fixtures/test.ts, and tests/wallpapers/ now falls under the area ESLint rules (the wallpapers ignore was removed, as the Story asks).

Deviations: the playwright-test-generator agent was not used; I wrote the page objects and tests myself, because the wiring and shared components had to be designed first. Locators were taken from a headless probe of production. WP-04: Enter and the Search button both end at /find/anime (a transient ?search=anime URL appears first, so the test waits on the final URL).
No bugs found in this group, so no Bug tickets.

Self-review: no findings (checked CLAUDE.md rules, [dup-pom] against empty pages/, live-content invariants, each test against its plan scenario).
