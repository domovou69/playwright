# TKT-1 Wallpapers: guest list, search, filters, detail, download and purchase-gate coverage

Type: Story | Status: To Do | Labels: plan-approved

Subtasks:
- TKT-2 Wallpapers: List, search and scroll (In Progress)
- TKT-3 Wallpapers: Category navigation and core filters (In Progress)
- TKT-4 Wallpapers: Filter combinations and detail page (In Progress)
- TKT-5 Wallpapers: Share, download, purchase gate and 404 (In Progress)


## Scope
The Wallpapers section of zedge.net as a guest: list page, header search (Wallpapers and default scope), infinite scroll and Load more, category navigation, list filters (Category / Tag / Price / Color / Sort by / Reset All), the wallpaper detail page, free download and the premium purchase gate. "Covered" means every in-scope scenario of the plan has a stable test that asserts invariants only.
The repository has no page objects, no app fixture and no tests yet, so group 1 also builds the wiring and the shared components.

## Groups
- List, search and scroll: WP-01, WP-02, WP-03, WP-04, WP-05, WP-06: wiring (app fixture, entry page), header search, cards component, infinite scroll and Load more. WP-02 and WP-05 are P1.
- Category navigation and core filters: WP-07, WP-08, WP-09, WP-10, WP-11, WP-12: header Categories menu, Explore block and category page, filtersBar component, Reset All, multi-select, Sort by. WP-07, WP-09 and WP-10 are P1.
- Filter combinations and detail page: WP-13, WP-14, WP-15, WP-16, WP-17, WP-18: pairwise filters, price range, deep link, then the detail page (WallpaperDetailPage first needed here).
- Share, download, purchase gate and 404: WP-19, WP-20, WP-21, WP-23, WP-25: share dialog, free download, premium gate (BuyModalPage), direct-URL gate, not-found page. WP-20 and WP-21 are P1.

## Reuse map
- Page objects and helpers to reuse: fixtures/test.ts (rejectCookieConsent, blockAds), src/utils/helper.ts (dismissCookieBanner, clearDownloadFolder, TIMEOUTS), src/utils/tags.ts (@wallpapers is registered). Nothing under pages/ exists today; CLAUDE.md names it as if it did.
- New page objects needed: app fixture and AppPageObjects (wallpapersListPage), WallpapersListPage with open(path), shared HeaderPage (search(value, scope), categories dialog), FooterPage and MainHeaderPage, shared CardLinkValidator and a cards component parameterised by href prefix (group 1); filtersBar component, filterDrawer, Explore-block component and CategoryPage (group 2); WallpaperDetailPage (group 3); downloadFlow component, shared BuyModalPage and a heading-agnostic not-found check (group 4). ESLint area rules for tests/wallpapers/ go in group 1.
- Shared components (header, footer, buy modal): created in pages/ by this Story, parameterised from the start (href prefix, scope names) so ringtones and notification sounds reuse them.

## Constraints
- Guest only, free content only; no login, no purchase, no load, no security probing.
- Production site, no destructive actions; content is live: assert invariants, never a title or an exact count.
- A download test checks that a free item really downloads (JPEG, not empty, magic ff d8 ff). Do not assert the countdown value, "Downloads left today" or "Get the App": they depend on an A/B variant.
- Conventions: CLAUDE.md (area table, tags, no waitForTimeout, no force, no conditionals, fixtures/test, explicit page objects).
- Headless browsers only. Free items are picked at run time as the first card without a crown under Price=Free.

## Acceptance criteria
- Every scenario of the plan that is in a group has a test with its ID in the title and the tags from the plan.
- npm run verify reports stable for every new test; lint, tsc and format:check are clean.
- Every bug found has a ticket (after a human approves it) and a @BUG:<KEY> test.
- Plan coverage (scripts/plan-coverage.mjs) shows no missing scenario of the groups.

## Out of scope
- WP-22 (premium item priced 10 shows Download instead of Buy): bug candidate, no test until the bug is filed; it follows the bug flow and gets a @BUG:<KEY> test then.
- WP-24 (Premium item without a price downloads like a free one): bug candidate, data-dependent; would need a test pinned to a GUID and a conditional-free way to find the item. Kept as a ticket and a note.
- Plan bug candidates 2, 3, 5, 6, 7, 8, 9, 10 get tests only after a human approves a ticket for them.
- Ringtones, Notification Sounds, Artists search, /profiles pages, Live Wallpapers, AI Wallpaper Maker, header Upload / Sign in / credits, "Download app" and "AD" tiles, narrow viewport, audio preview (wallpapers have none).

## Links
- Plan: specs/wallpapers.plan.md
