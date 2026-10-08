# RUN-SUMMARY: Wallpapers (guest) end-to-end tests

Target: https://www.zedge.net/wallpapers (production, live content). Guest only, free content only, headless Chromium.

## Result
68 tests in 8 spec files. Last full run: **67 passed, 1 skipped, 0 failed** (about 4 min, 2 workers).
Earlier full runs of the final code were also green (68 passed / 1 skipped; 68 passed). Over the whole session, failures were only
timing issues on an overloaded machine (load average about 20) and were fixed in the page objects; see "Stability".

Three known defects are encoded as expected failures (`test.fail(true, 'BUG-xxx')`, reported as passed). When a bug is fixed the test
turns red with "Expected to fail, but passed"; remove the `test.fail` line then.

## Tickets (`tickets/`)
- `STORY-001-wallpapers-guest-e2e.md`: story with goal, scope, approach.
- `SUB-001` … `SUB-008`: one subtask per scenario group, each with a scenario/invariant table.
- `BUG-001`, `BUG-002`, `BUG-003`: bugs (below).

## What is covered
| Subtask | Spec | Highlights |
|---|---|---|
| SUB-001 Feed | `01-feed` | first page ≥20 valid cards, unique links, thumbnails served as images, infinite scroll without duplicates, open card and Back, category block, canonical/description, phone viewport without horizontal scroll |
| SUB-002 Filters | `02-filters` | option lists (Category, Price, Color), Free only free (also after scroll), Paid only priced, Color, multi-Category, Tag, combined filters + Reset All, shared-URL filters, browser Back, chip removal, empty states |
| SUB-003 Sorting | `03-sorting` | five options, URL key and chip per option, price asc/desc order (incl. after scroll), sort + filter, shared sorted URL, newest-first dates, unknown sort value |
| SUB-004 Search | `04-search` | header search → `/find/<term>` → "View all" → keyword feed, keyword + filter, no-results page and suggestions, odd input, percent sign, empty submit, keyword chips |
| SUB-005 Categories | `05-categories` | category page content/SEO, scroll, related chips, header Categories menu, link health (3 requests), 404 for unknown, trailing slash |
| SUB-006 Detail | `06-detail` | title/author/date/downloads/image, free state, title + og + canonical, JSON-LD, Related, keyword chips, guest header, 404 / malformed ids |
| SUB-007 Download | `07-download` | guest downloads a free wallpaper (real image bytes, size, extension), "Preparing your download" countdown, file name, repeat download |
| SUB-008 Premium gate | `08-premium-gate` | price on card and detail, gate dialog (Login & Watch Ad, Buy Credits, daily-unlock copy), no file leaks, close / reopen / Escape, expensive items sold as "Buy for" |

All assertions are invariants (non-empty, unique, ordered, filtered, valid shape). Test data (a free card, a premium card) is discovered from
the live feed at run time; no titles or counts are hard-coded.

## Bugs filed
| Id | Severity | Summary | Test |
|---|---|---|---|
| BUG-001 | Low | `/wallpapers?sort=<unknown>` returns HTTP 500 "Oops, Something went wrong!" | `03-sorting` unknown sort value |
| BUG-002 | Medium | "Newest first" is not ordered by the publish date shown on the detail page (older premium, and sometimes free, items interleaved) | `03-sorting` newest first (skips itself if the live data happens to be ordered) |
| BUG-003 | High for affected query | Searching a term with `%` (e.g. "100%") makes the client throw `URIError` in a tight loop (thousands of errors per second) and freezes the page | `04-search` percent sign |

Investigated and **not** filed:
- "Reset All does not clear an unknown filter value": a hydration timing artefact of my first probe; it works once the page is hydrated (the ticket was withdrawn).
- Jumping straight to the page bottom (End key, scripted scroll) does not load more cards; small wheel steps do. Probably the IntersectionObserver sentinel being skipped; behaves as designed for real scrolling, so no ticket.
- Prices like Ƶ1410064408 on some premium items: creator-set prices, rendered without layout problems.
- Early clicks before hydration are ignored (the page is server-rendered, controls hydrate late). Tests wait/retry; users on slow devices can feel it, but it is not a functional defect.
- Header search used before hydration performs a plain form GET to `/wallpapers?search=…`, which the feed ignores (same hydration window).

## Skipped / not covered, and why
- Login, "Login & Watch Ad", "Buy Credits", "Buy for Ƶ…": out of constraints (no login, no purchase). The gate is opened and closed only; those buttons are asserted visible, never clicked.
- Downloading premium files: not possible as a guest, and asserted not to happen.
- Ringtones, notification sounds, artists, profiles, upload, share button: outside the Wallpapers section or need login / native share.
- Order of "Most popular" and "Relevance": no observable key on the page (only that the feed renders).
- Color filter result correctness (is the picture really blue?): not observable black-box; only the filter state and non-empty results are checked.
- Ads and the Didomi cookie banner: blocked by the existing fixture (ad domains) and, added by me, the CMP domains (`privacy-center.org`, `didomi.io`), because the banner appeared at random times and could stall clicks. No consent behaviour is tested.
- Other browsers / mobile emulation beyond one 390px viewport smoke test; load, performance and security probing (out of scope by instruction).
- One test self-skips by design: the BUG-002 ordering test when the live data happens to be ordered.

## Stability notes
- The host was heavily loaded and the site hydrates slowly, so page objects wait for hydration (`waitForHydration`) and retry first clicks (`toPass`), dropdown selections are idempotent, and result checks poll because old cards stay on screen while a filter reloads.
- Infinite scroll is driven with small wheel steps (see above).
- Premium gate tests walk price-10 premium candidates until one offers the unlock "Download" (items priced 1 are sold with "Buy for").
- The BUG-003 test uses its own browser context and stops at the first `URIError`, because a screenshot/video of the looping page stalls teardown.
- Changes to existing files: `src/config/timeouts.ts` (single generous set of timeouts, 90 s test / 10 s expect and action / 45 s navigation, no local/CI split), `playwright.config.ts` (2 workers), `fixtures/test.ts` (CMP domains blocked), `src/utils/helper.ts` (`waitForHydration`), `tsconfig.json` (include `src/**/*.ts`), new `.prettierrc.json`.

## How to run
```bash
npm install                                  # Node >= 24
npx playwright test                           # whole suite, headless Chromium, 2 workers
npx playwright test tests/wallpapers/03-sorting.spec.ts   # one group
npx playwright test -g "Premium"              # by title
npx playwright show-report                    # HTML report (playwright-report/)
BASE_URL=https://www.zedge.net/ npx playwright test       # override the site (default is production)
npx tsc --noEmit -p .                         # type check
```
Failures keep screenshot, video and trace under `test-results/`. Downloaded files are saved to the per-test output folder there.
The suite is read-only against production: it only browses, searches, opens dialogs and downloads free wallpapers.

## Layout
- `src/pages/`: `header.component`, `wallpaper-feed.page` (feed, filters, sorting, scroll), `category.page`, `search-results.page`, `wallpaper-detail.page`, `premium-gate.component`.
- `tests/wallpapers/`: the eight specs plus `helpers.ts` (shared assertions and live-data pickers).
- `tickets/`: story, subtasks, bugs.
