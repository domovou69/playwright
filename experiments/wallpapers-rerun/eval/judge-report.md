# Wallpapers suite review: cases X, Y, Z

Target: https://www.zedge.net/wallpapers. I tested as a guest in headless Chromium against production on 2026-10-08. I built the inventory from my own exploration before I opened the case folders. I checked every bug claim on the live site with a headless Playwright script. I did not run the suites.

## Inventory

| Id | Feature | Priority |
|---|---|---|
| F1 | List page loads: H1, filter bar, card grid with valid `/wallpapers/<uuid>` links and thumbnails | high |
| F2 | Infinite scroll, then "Load more"; appended cards keep order and have no duplicates | medium |
| F3 | A card opens its detail page; browser Back returns to the list | high |
| F4 | Header search: scope chip (All → `/find/<q>`, Wallpapers → `?keyword=`), results, "View all" | high |
| F5 | Search edge cases: no results with suggestions, special characters (`%`, `&`, non-Latin), empty submit, Cancel | medium |
| F6 | Sort by: 5 options, `sort=` URL key, chip, order invariants (price asc/desc, newest) | high |
| F7 | Price filter: Free / Paid and the From / To range | high |
| F8 | Color filter (multi-select) | medium |
| F9 | Category filter (multi-select) | medium |
| F10 | Tag combobox filter | medium |
| F11 | Filter state: active chips, chip removal, Reset All, combinations, deep link / reload / Back | high |
| F12 | Content-type switch in the bar (Wallpapers / Ringtones / Notification Sounds / Artists) | low |
| F13 | Category navigation: header Categories menu, "Explore different wallpaper categories" block, `/category/wallpapers/<slug>` pages with sub-chips | medium |
| F14 | Detail page content: title, artist, date, downloads, Premium/price, keyword chips → keyword feed, Related | high |
| F15 | Free download: "Preparing your download" countdown dialog, then a real image file | high |
| F16 | Premium gates (no purchase): "Buy for Ƶn" → "To buy this item you need n Zedge Credits"; premium "Download" → "Unlock and Support the Artist"; close / Escape; no file leaks | high |
| F17 | Share dialog (link textbox, Copy) | low |
| F18 | Error handling: unknown id or category → 404 page; invalid query params | medium |
| F19 | SEO and metadata: title, canonical, og:*, JSON-LD | low |
| F20 | Narrow or phone layout: Filters drawer, no horizontal scroll | low |
| F21 | Guest header and footer (Sign in, Upload, credits, footer links) | low |

---

## Case X

### Scores

| Criterion | Score | Evidence |
|---|---|---|
| coverage | 4 | Covers 19 of 21. Deep feed, filter, sort and search groups (`02-filters.spec.ts`, 13 tests; `03-sorting.spec.ts`, 9 tests), SEO and JSON-LD (`06-detail.spec.ts:34-52`), and a phone viewport (`01-feed.spec.ts:65`). Missing: Share (F17) and content-type switch (F12). Partial: no From/To price range (F7) and no "Load more" (F2). |
| assertions | 4 | Strong invariants: price order after scroll (`03-sorting.spec.ts:42-57`), image magic bytes and size (`07-download.spec.ts:26-29`), unique hrefs. Weak: empty search only checks `main` is visible (`04-search.spec.ts:96-98`); malformed id only checks `<500` (`06-detail.spec.ts:86-88`); multi-category only checks the result changed (`02-filters.spec.ts:56`). Wrong oracle: "free wallpaper is not marked Premium" (`06-detail.spec.ts:29-31`), but 11 of 24 `?free=true` cards carry a crown and "Premium" on the live site. |
| locators | 4 | Mostly roles and names (`header.component.ts:11-16`, `premium-gate.component.ts:12-18`). Fragile spots: hydration detected through React internals `__reactProps` (`src/utils/helper.ts:58-62`), XPath ancestor chip (`wallpaper-feed.page.ts:153`), `img[src*="image-server"]` (`wallpaper-detail.page.ts:37`), and CSS `style*=` thumbnails (`helpers.ts:17`). |
| page_objects | 3 | `WallpaperFeedPage` is a 211-line class that holds feed, filters, sort, chips and scroll (`wallpaper-feed.page.ts`), with no filter component. Price parsing is copied three times (`wallpaper-feed.page.ts:192-199`, `helpers.ts:48-55`, `helpers.ts:67-71`). `waitForDownloadDialogToClose` rebuilds the `preparingDialog` locator (`wallpaper-detail.page.ts:77`). Specs use raw locators (`05-categories.spec.ts:27,39,50`). |
| test_quality | 3 | No tags on any test. Fixed sleeps: `page.waitForTimeout(1500)` (`08-premium-gate.spec.ts:63`), plus 300 ms and 100 ms waits in polling loops (`wallpaper-feed.page.ts:135`, `helper.ts:27`). Branching at run time: `test.skip(ordered…)` combined with `test.fail` (`03-sorting.spec.ts:81-88`), `test.skip` on keyword count (`04-search.spec.ts:108`, `06-detail.spec.ts:67`), and an `if` loop in `beforeEach` (`08-premium-gate.spec.ts:44-52`). Titles are clear and tests are independent. A comment is duplicated (`04-search.spec.ts:67-68`). |
| bug_reports | 4 | Three tickets with steps, actual, expected, severity and notes (`tickets/BUG-001…003`). Each is linked to a `test.fail` test and each reproduced. It missed both known bugs. It saw the ZED-3 symptom ("walk price-10 candidates until one offers Download", `08-premium-gate.spec.ts:39-53`) and coded around it without filing it. |

### Findings

| Class | Finding |
|---|---|
| oracle | `06-detail.spec.ts:29` asserts that a free card's detail page has no "Premium" label. The test takes the first `?free=true` card, and 11 of 24 such cards are crowned "Premium" with no price. The result depends on the live data. |
| oracle | `08-premium-gate.spec.ts:39-53` and `:89-95` treat "price-10 premium shows Download" as normal and filter it out. This hides ZED-3 instead of flagging it. |
| oracle | Weak checks: empty search (`04-search.spec.ts:93-99`), malformed id (`06-detail.spec.ts:86`), multi-category "list differs" (`02-filters.spec.ts:56`). |
| convention | No tags (`@smoke` / `@regression`) on any test, so no smoke subset can run. |
| convention | Fixed sleep `page.waitForTimeout(1500)` in `08-premium-gate.spec.ts:63`. |
| convention | Conditionals and run-time skips in tests: `03-sorting.spec.ts:88`, `04-search.spec.ts:108`, `06-detail.spec.ts:67`, and the `beforeEach` loop at `08-premium-gate.spec.ts:44`. |
| flaky | The BUG-002 test is `test.fail` plus a self-skip when the data is ordered (`03-sorting.spec.ts:81-88`). It can turn green by skipping and never signal a fix. |
| locator | Waits for hydration through React private props (`helper.ts:58-62`, `header.component.ts:21-23`). This breaks on any React or build change. |
| dup-pom | Card-price parsing appears three times (feed page object and two helpers); `helpers.ts` holds data pickers that belong in a page object. |
| dup-pom | `WallpaperFeedPage` is a god class; Filters, Sort and Chips should be components. |
| missing | Share dialog, From/To price range, "Load more", content-type switch, Buy-modal contents (the "Buy for" button is asserted but never opened, `08-premium-gate.spec.ts:89-95`). |

### Bugs

| Claim | Verdict | How checked |
|---|---|---|
| BUG-001 `?sort=<unknown>` returns HTTP 500 | new-confirmed | `/wallpapers?sort=BOGUS` returned status 500 with H1 "Oops, Something went wrong!"; `colors=zzz` returns 200. |
| BUG-002 "Newest first" is not ordered by publish date | new-confirmed | Detail dates of the first 10 `?sort=NEWEST` cards: Oct 8, Oct 8, **Oct 6**, Oct 8, Oct 8, Oct 8, **Oct 6**, Oct 8, **Oct 4**, Oct 8. |
| BUG-003 `%` in a search makes the page loop on `URIError` | new-confirmed | `/find/100%25` in its own context logged 844 `URIError` console messages in 5 s. Severity "High for the affected query" is fair. |

Known bugs not found: **ZED-3, ZED-4**.

### Merge verdict

Merge after small fixes. The suite is broad and its invariants are strong, but it needs tags, no sleeps or run-time skips, a fixed free/Premium oracle, and a split of the feed page object.

---

## Case Y

### Scores

| Criterion | Score | Evidence |
|---|---|---|
| coverage | 4 | Covers 18 of 21, including scroll and "Load more" (`wallpapers-scroll.spec.ts`), price range (`wallpapers-filters.spec.ts:264-272`), deep link (`:274-292`), Share (`wallpaper-detail.spec.ts:37`), the Buy gate (`wallpapers-purchase.spec.ts`) and 404 (`wallpaper-detail.spec.ts:50`). Missing: SEO (F19), narrow layout (F20), content-type switch (F12). Partial: no Unlock / "Login & Watch Ad" gate (F16), no `%` or empty search (F5), no invalid query params (F18), no newest-date order (F6). |
| assertions | 4 | `CardLinkValidator.validate` collects every broken card (`CardLinkValidator.ts:12-35`). `validatePriced` checks order and bounds (`CardGrid.ts:75-92`). `validateAppended` checks that old cards stay in order (`CardGrid.ts:180-186`). Weak: `validateFirstHrefsDiffer` ("first 3 hrefs changed") is the only result check for Category, Tag, Color and Newest (`wallpapers-filters.spec.ts:32,191`). Brittle copy: every `open()` waits for the exact H1 "download hd phone wallpapers for free" (`WallpapersListPage.ts:35`). |
| locators | 3 | Filter bar, drawer, header and modal use roles (`FiltersBar.ts:22-28`, `FilterDrawer.ts:10-12`, `BuyModalPage.ts:12-16`). But the central card checks use class and style fragments: `div[class*="card-footer"]`, `.bg-cover`, `div[class*="card-header"] [style*="premium"]` (`CardGrid.ts:61,98`, `CardLinkValidator.ts:23-28`). Also `img.object-cover` (`WallpaperDetailPage.ts:29`) and `xpath=..` (`ExploreCategories.ts:11`). |
| page_objects | 4 | Clear components (`FiltersBar`, `FilterDrawer`, `CardGrid`, `CardLinkValidator`, `HeaderPage`, `BuyModalPage`, `DownloadFlow`), parameterised by href prefix and reused across pages (`AppPageObjects.ts:22-28`, `CategoryPage.ts:19-22`). Small issues: price parsing is in both `CardGrid.prices` and `CardLinkValidator`; `LOAD_TIMEOUT` is defined in two files; `CardGrid` (187 lines) mixes prices, navigation and paging. |
| test_quality | 4 | Every test has an id, plan tags and `@smoke` / `@regression` (`wallpapers-filters.spec.ts:24`). ESLint enforces `no-conditional-in-test` and `require-tags` (`eslint.config.js:35-37`). Tests have no sleeps, rows are data-driven, and each test starts on its own. Flake risk: the href-differ checks on live data, and the multi-select race the summary mentions (`RUN-SUMMARY.md:47`). |
| bug_reports | 2 | One ticket, TKT-6 (`tickets/WPR-6.md`). It has clear steps, expected and actual, and a screenshot, and it reproduced. But it has no severity, its file name (`WPR-6`) does not match its key (`TKT-6`), and it has no `@BUG` test (`RUN-SUMMARY.md:44`). The plan records the 500 on `?sort=BOGUS`, ZED-3 (named explicitly, plan line 539), a dialog console error and a11y gaps (`specs/wallpapers.plan.md:603-621`), but none of these was filed. |

### Findings

| Class | Finding |
|---|---|
| locator | Card invariants (price, crown, image) depend on CSS class or style fragments (`CardGrid.ts:61,98`, `CardLinkValidator.ts:23-28`), and the preview uses `img.object-cover`. |
| oracle | Result changes for Category, Tag, Color, Most popular and Newest are proven only by "first 3 hrefs differ" (`CardGrid.ts:50-54`). Nothing checks what the results contain, so the check can fail when two sorts share their top items. |
| oracle | `validatePremiumPrice` asserts "Buy for" and no Download (`WallpaperDetailPage.ts:74-78`). Price 10 is deliberately excluded (`wallpapers-purchase.spec.ts:3`), so ZED-3 can never surface. |
| flaky | `WallpapersListPage.open` waits for the exact marketing H1 text (`WallpapersListPage.ts:35`). Any copy change breaks every test. |
| missing | No Unlock / "Login & Watch Ad" gate, no SEO checks, no phone or narrow layout, no invalid-param or `%` search case, no newest-first date order, no chip-removal click, no browser Back. |
| missing | TKT-6 has no regression test. Several defects seen during planning were left unfiled (`RUN-SUMMARY.md:26-33`). |
| dup-pom | Price-badge parsing is duplicated (`CardGrid.prices` and `CardLinkValidator`); `LOAD_TIMEOUT` is defined twice. |
| convention | Ticket file names (`WPR-*.md`) do not match the keys inside them (`TKT-*`); ticket statuses are stale (`RUN-SUMMARY.md:45`). |

### Bugs

| Claim | Verdict | How checked |
|---|---|---|
| TKT-6: Price "From" only gives `maxPrice=NaN` | new-confirmed | Price → From = 11 → Enter gave `/wallpapers?minPrice=11&maxPrice=NaN`. |

Known bugs not found: **ZED-3** (in the plan as candidate 4 but not filed), **ZED-4** (the plan notes a different `DialogTitle` message on the download dialog and did not file it).

### Merge verdict

Merge after small fixes. The structure and conventions are the best of the three, but the card locators need to stop depending on class names, the Unlock gate needs a test, and the bugs it observed need to be filed.

---

## Case Z

### Scores

| Criterion | Score | Evidence |
|---|---|---|
| coverage | 3 | Covers 17 of 21. Good depth on the narrow Filters drawer (`wallpapers-filters-narrow.spec.ts`), scroll and "Load more" (`wallpapers-scroll.spec.ts`), and search scope and Cancel (`wallpapers-search.spec.ts:49-70`). Missing: 404 / error handling (F18), Share (F17), SEO (F19), content-type switch (F12). Shallow: the download only checks that a file exists and is non-empty (`DownloadFlow.ts:15-28`); the detail page has no date check or Back; sorting checks no ascending or newest order. |
| assertions | 2 | Brittle on live data: every word of "city tower car" or "messi" must appear in a card label (`wallpapers-search.spec.ts:12-23`); bug tests pin GUIDs and exact titles (`wallpapers-purchase.spec.ts:112,133`); `validateFirstCards` requires at least one priced card (`WallpapersListPage.ts:202`). Checks that cannot fail: `clickCancelSearch` asserts `toHaveText('')` on an `<input>` (`HeaderPage.ts:150`); `validateHeader` branches on an input's `innerText`, which is always empty (`HeaderPage.ts:63-68`). Results are "proven" mostly by `hrefsAfter != hrefsBefore` (`wallpapers-filters.spec.ts:53`). |
| locators | 2 | Class fragments and positions: `nav[class*='header_nav']`, `div[class*="Modal_modal"]).nth(1)`, `div.heading-xl`, `span.body-lg` (`HeaderPage.ts:22`, `BuyModalPage.ts:17-21`); `div[class*="CardsContainer"]`, `a[class*="A_link"]` (`WallpapersListPage.ts:60-65`); positional XPath `(//main//h1/following-sibling::div/div)[2]/button[1]` (`MainHeaderPage.ts:12-13`); `buyBtn …nth(1)` (`WallpaperDetailPage.ts:20`); `button[arial-role="combobox"]`, which depends on a markup typo (`HeaderPage.ts:28`). |
| page_objects | 2 | `WallpapersListPage extends HeaderPage` (296 lines) and adds pass-through wrappers (`WallpapersListPage.ts:14,244-295`). `filterByCategories / Color / Tag / Price` are four copy-pasted methods, and `isXSelected` is copied three times (`FiltersBar.ts:50-160`). File and class names differ (`MainHeaderPage.ts` exports `BodyHeaderPage`, `BuyModalPage.ts` exports `ModalBuyPage`). Commented-out code (`WallpapersListPage.ts:40`), `console.log`, and a raw `setTimeout` poll in a page object (`DownloadFlow.ts:21-25`). |
| test_quality | 2 | Tags and `@BUG` annotations are good. But specs contain branching helpers (`applyFilter` switch, `wallpapers-filters.spec.ts:13-26`; `pickPaidCardSkippingTen` loop + `if`, `wallpapers-purchase.spec.ts:35-44`; `closePurchaseModal` `if`, `:14-20`). Polling with `waitForTimeout(100)` and `setTimeout` (`WallpapersListPage.ts:89`, `DownloadFlow.ts:25`). A shared `downloads/` folder is cleared in `beforeAll` (`wallpapers-purchase.spec.ts:47`), which races under parallel workers. Some tests are very long: WP-02 runs 9 searches in one test, and WP-35 has 9 steps. |
| bug_reports | 3 | Two `@BUG` tests, each with a `{type:'bug'}` annotation, expected vs actual, and both reproduce (`wallpapers-purchase.spec.ts:96-139,159-196`). There are no ticket or bug files, no severity and no standalone repro steps. The ZED-3 test depends on two fixed live items. Other defects named in the plan (Price "Clear" in the drawer, `minPrice=NaN` with only "To", `specs/wallpapers.plan.md:434-437`) were not filed. |

### Findings

| Class | Finding |
|---|---|
| locator | The page objects rely widely on CSS-module class fragments, `.nth(1)`, positional XPath and the `arial-role` typo (see the locators row). |
| dup-pom | Four near-identical `filterByX` methods and three `isXSelected` methods in `FiltersBar.ts`; the list page inherits from the header instead of composing it; pass-through wrappers. |
| oracle | Search relevance requires every query word to appear in some card's aria-label, for live terms like "messi" and "city tower car" (`wallpapers-search.spec.ts:12-23`). |
| oracle | `clickCancelSearch` uses `toHaveText('')` on an input, and `validateHeader` branches on an input's `innerText`. Neither check can fail. |
| oracle | The plan states "Category filter is single-select" (`specs/wallpapers.plan.md:41`), but the live site accepts `categories=NATURE,ANIMALS`, and the narrow test's `/NATURE/` check (`wallpapers-filters-narrow.spec.ts:32`) cannot tell the two apart. |
| flaky | The download test writes to a shared `downloads/free/<title>.jpg` that `beforeAll` clears, and it polls with `setTimeout`. Two workers would collide. |
| flaky | The bug tests pin specific production GUIDs and titles (`wallpapers-purchase.spec.ts:112,133`). If either item is removed or repriced, the test fails for reasons that have nothing to do with the bug. |
| convention | Conditionals and loops in spec files; `console.log` and commented code in page objects; WP-02 and WP-35 are multi-scenario mega-tests. |
| missing | No 404 or invalid-param tests, no Share, no SEO, no date or newest order, and no file-type or magic-byte check on the download. |

### Bugs

| Claim | Verdict | How checked |
|---|---|---|
| WP-29 `@BUG:ZED-3`: price-10 premium items show Download vs Buy | known (ZED-3) | `a1b0f0ad…` "White Feathers Floating Dark Wallpaper" shows `Download`; `e1b7e619…` "Spooky Mansion" shows `Buy for Ƶ10`. |
| WP-33 `@BUG:ZED-4`: Buy modal logs a missing-Description console warning | known (ZED-4) | Opening "Buy for Ƶ10" logged ``Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}``. |

Known bugs not found: none.

### Merge verdict

Rework. Both known bugs are documented, but the class- and position-based locators, the copy-pasted page objects, the branching in specs and the unsafe download flow make the suite hard to maintain and likely to fail on live data.

---

## Comparison

- **Breadth:** X covers the most features (19 of 21, including SEO, error handling and phone width). Y is close (18) and is the only case with Share and a full Buy-gate flow. Z is narrower (17) but is the only case that exercises the narrow Filters drawer in depth.
- **Assertions:** X and Y both assert live-content invariants well: price order, uniqueness, image bytes in X, and ordered append in Y. Z leans on "hrefs changed", exact live search words and pinned items.
- **Locators and page objects:** Y has the cleanest component split and role-based controls but class-based card checks. X uses roles well but packs everything into one feed class. Z has the most fragile selectors and the most duplication.
- **Conventions:** Y enforces tags and no-conditional rules with lint. X has no tags and a few sleeps and run-time skips. Z has tags but puts branching and polling in specs and page objects.
- **Bugs:** X filed three confirmed new defects but none of the known ones. Z hit both known bugs (ZED-3, ZED-4) as annotated tests but filed no tickets. Y filed one confirmed new defect and left several observed issues, including ZED-3, as plan notes only.
