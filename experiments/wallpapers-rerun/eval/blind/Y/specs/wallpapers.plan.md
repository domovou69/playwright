# Wallpapers Section Test Plan

Status: approved 2026-10-08

## Application Overview

Scope: the Wallpapers section of zedge.net - list page (`/wallpapers`), header search with the "Wallpapers" scope, category
navigation (header "Categories" menu and the "Explore different wallpaper categories" block with its `/category/wallpapers/<slug>`
pages), list filters (Category / Tag / Price / Color / Sort by / Reset All), infinite scroll and "Load more", the wallpaper
detail page (preview image, artist, keyword chips, Related, Share), free download, and the premium purchase gate.

Constraints:

- Guest user only, free content only. Every purchase or sign-in flow stops once the dialog is verified.
- Desktop viewport only (Desktop Chrome project).
- Live production site, headless browsers only.
- No security testing (XSS, SQL injection, fuzzing) and no load or performance testing.
- Content is live: assert invariants (URL params, badges, prices, counts > 0, href changes), never a specific title or exact
  count. Items are identified by their `href` (`/wallpapers/<GUID>`).
- Out of scope: Ringtones and Notification Sounds, Artists search, `/profiles/<GUID>` pages, Live Wallpapers
  (`/live-wallpapers`), AI Wallpaper Maker (`/wallpaper-maker`), header Upload / Sign in / credits (shared header, they leave for
  `account.zedge.net` or open a login/credits dialog), "Download app" and "AD" tiles inside the card grid, narrow viewport.

## Revision log

- v1 (2026-10-08): first plan for the Wallpapers area. Every fact below was checked live through the Playwright MCP (headless,
  guest, production) on 2026-10-08. I did **not** use the `playwright-test-planner` agent for a first draft: `specs/wallpapers.plan.md`
  did not exist and `specs/notification-sounds.plan.md` (approved format reference per the run notes) already gave the structure,
  so I probed the site directly, as that plan did. Each expected result carries `[verified-live]` (seen in this session, with
  what I did) or `[assumed]` (not seen).

## Premise check: repository state and the "preview"

Two things differ from what the command and CLAUDE.md assume. Please confirm both at the gate.

1. **The repository has no page objects, tests or `app` fixture.** `git ls-files` shows only the environment layer
   (`fixtures/test.ts` with `rejectCookieConsent` and `blockAds` only, `src/utils/helper.ts`, `src/utils/tags.ts`, scripts,
   `.claude/`). There is no `pages/`, no `tests/`, no `AppPageObjects`, and `specs/wallpapers.plan.md` (the "reference for the
   format") did not exist. CLAUDE.md describes `HeaderPage`, `FooterPage`, `MainHeaderPage`, `BuyModalPage`, `CardLinkValidator`,
   `app.wallpapersListPage.filtersBar / .filterDrawer / .downloadFlow` as if they exist; **none of them is on disk.** The reuse map
   below is therefore "all new, named as CLAUDE.md names them". The tag `@wallpapers` is registered in `src/utils/tags.ts` and the
   area is in the `## Areas` table, so the "stop and say what to add first" rule does not trigger.
2. **Wallpapers have no audio player.** The "preview" is a static image (673x1206 `img`, loaded). There is nothing to play, so the
   audio-preview scenario of the sibling areas does not exist here and the Go / no-go "does a preview play headless" question
   becomes "does the preview image load" (yes).

## Verified facts (used as the test oracle)

All `[verified-live]` on 2026-10-08 unless noted.

1. **List page.** `/wallpapers`, page title "Download free HD wallpapers for your phone", H1 "Download HD Phone Wallpapers for Free"
   (accessible text; the DOM shows `For` capitalised by CSS, so match case-insensitively). Filter bar: a label chip
   `Wallpapers`, then `Category`, `Tag` (a `combobox`), `Price`, `Color`, `Sort by`. An H2 "Explore different wallpaper categories"
   sits below the grid. `Load more` exists in the DOM but is hidden at first load.
2. **Cards.** 24 on first load, `a[href^="/wallpapers/<GUID>"]`; all 24 had a GUID href, a non-empty `title`, an `aria-label` equal
   to the title (not a copy-paste from another area), and a CSS background image from `is.zobj.net/image-server`. No play button
   and no duration. The grid also holds one "AD" tile and one "Download app" tile (not cards, no `/wallpapers/` href).
3. **Price badge.** First 24 on one load: 16 with a crown (`div[class*="card-header"]` icon `premium.*.png`) and a digits-only price
   in `div[class*="card-footer"]` (`10`), 8 with neither. **Every card with a price badge had a crown** (0 exceptions in every list
   I read). **The reverse is not true:** under `?free=true` 1 of 24 cards had a crown and no price (4 of 24 under
   `categories=ANIMALS&free=true`, 3 of 24 under `colors=black`, 6 of 24 under `tags=bmw`). See bug candidate 1.
4. **Search.** The header chip reads **"All"** on a fresh `/wallpapers`; options (`menuitemradio`) All, Wallpapers, Ringtones,
   Notification Sounds, Artists. With the "Wallpapers" scope: `dragon` gives `/wallpapers?keyword=dragon`, H1 "Dragon Download HD
   Phone Wallpapers For Free", 24 cards, 17 of 24 titles contain "dragon", the input keeps the term, the chip row shows "Wallpapers"
   and a "Cancel" button. `dark forest` gives `?keyword=dark%20forest`, 24 cards, the first 6 titles are all "forest". No match
   (`zzzxxxqqqnonexistent123456`): H2 "Couldn’t find anything", 0 cards, chip stays "Wallpapers", "Reset All" visible. With the
   default "All" scope the search leaves the section: `anime` went to `/find/anime` (15 wallpaper cards plus keyword chips and a
   "Wallpapers - View all" block).
5. **Categories menu.** `dialog` "Categories", groups Wallpapers / Ringtones / Notification Sounds; the Wallpapers group has 24
   links `a[href="/wallpapers?categories=<ENUM>"]` (`FUNNY`, `TECHNOLOGY`, ..., `CARS_N_VEHICLES`, `NEWS_N_POLITICS`, `PATTERNS`,
   `COMICS`); the other groups have 28 and 28 links. Clicking Nature gives `/wallpapers?categories=NATURE`, 24 cards, dialog closed,
   chips "Nature" and "Reset All".
6. **Filters and URL params.**

   | Control  | Options                                                                                         | Mode   | URL param                                                                                       |
   | -------- | ----------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
   | Category | 24 options (`role=option`, same as the menu)                                                    | multi  | `categories=NATURE%2CSPACE`                                                                     |
   | Tag      | contextual list (10 on the unfiltered list; `role=option`, `aria-selected`)                     | multi  | `tags=bmw%2Ccar`                                                                                |
   | Price    | Free, Paid (options); From, To (`input[type=number]`, `role=menuitem`)                          | -      | `free=true`, `paid=true`, `minPrice=`, `maxPrice=`                                              |
   | Color    | Black, Pink, Red, Blue, White, Gold, Green, Silver (options)                                    | multi  | `colors=black`, `colors=red%2Cblue`                                                             |
   | Sort by  | Relevance, Newest first, Price: Low to High, Price: High to Low, Most popular (`menuitemradio`) | single | `sort=NEWEST`, `PRICE_ASC`, `PRICE_DESC`, `POPULAR` (Relevance is checked by default, no param) |

   Dialogs open by name (`getByRole('dialog', { name })` worked for Category, Price, Color, Sort by); the Tag combobox opens a dialog
   with options. Dropdowns stay open after a click and close with Escape. Applied filters show as chips plus `Reset All`. There is
   no Duration filter and no slider. The Price inputs are addressed as `getByRole('menuitem', { name: 'From' | 'To' })`.

7. **Price.** Default paid list: every price is **10**. `?minPrice=11&sort=PRICE_ASC` gives prices `11,11,...,12` (lowest above 10
   is **11**). `PRICE_DESC` with `paid=true` gives `1410064408, 100000000, 4000000, 1000000, ...` (non-increasing; the top item,
   "Hole", costs 1,410,064,408 credits and shows unformatted). `PRICE_ASC` and `POPULAR` on the unfiltered list start with 24 free
   cards. From=50 then To=500 through the UI: 24 cards, all priced 50..500. From alone gives `?minPrice=50&maxPrice=NaN` (bug
   candidate 2). **`?paid=true&minPrice=11&sort=PRICE_ASC` returned 24 cards priced 1**: `minPrice` is ignored with `paid=true`
   (bug candidate 3).
8. **Scroll.** 24 cards, "Load more" hidden; gradual scrolling (8 x 200 px steps, 300 ms apart, 2 rounds) -> 72, "Load more"
   visible and enabled, first 24 hrefs unchanged, no duplicates; click -> 96, no duplicates, previous hrefs unchanged.
9. **Detail page.** `/wallpapers/<GUID>`, page title `<title> wallpaper by <artist> - Download on ZEDGE™ | <last 4 of GUID>`,
   canonical equals the URL, H1 = card title, artist link `a[href^="/profiles/"]`, a date, "< 10 Downloads" text, an optional
   description, keyword chips `a[href="/wallpapers?keyword=<tag>"]` (3-5 per page), a preview `img` (673x1206, loaded, empty `alt`),
   one unnamed icon button = Share (`button[data-event="SHARE_CONTENT"]`, two in the DOM, one hidden on small screens), "Download"
   or "Buy for Ƶ<price>", and a "Related" H2 with 24 cards (the open item is not among them).
10. **Share.** The visible Share button opens a dialog "Share item" ("Copy the link or share this item across various platforms!",
    a "Copy" button). No toast and no URL change. Closing it was not observed.
11. **Free download.** "Download" opens a `dialog` "Preparing your download" with a countdown (13-14 seen) and "Please wait a few
    moments for the download to begin"; the download fired about **16.8 s** after the click: `llama_disco_3.jpg`, 1,357,884 bytes,
    JPEG magic `ff d8 ff e0`. Other free items: `llama_disco_2.jpg` 1,346,915 B, `llama_disco.jpg` 1,202,484 B, `blast_off.jpg`
    1,054,632 B. No login, no ad, no "Unlock and Support the Artist" modal. The dialog was gone 1.5 s after the download. The file
    name is the title in lower case with underscores.
12. **The download dialog depends on an A/B experiment.** The cookie `zedgeExperiments_marketplace` is base64 of
    `["web_download_limit_v2.<variant>"]`. Variant **A** (seen in 2 contexts): the dialog also shows **"Downloads left today: 3"**
    and "Get the App"; the counter fell 3 -> 1 over two further downloads. Variant **CG** (seen in 1 context): no counter and no
    "Get the App", 4 downloads in a row all succeeded. A fresh browser context gets a fresh counter, so the quota is per session,
    not per IP. What happens at "0 left" in variant A was **not** probed. Tests must not assert the counter, "Get the App" or the
    countdown number.
13. **Premium gate depends on price.** Price **10**: detail shows "Premium", "10", an unnamed icon button and a visible "Download"
    (no Buy); Download opens "Unlock and Support the Artist" (artist name, "Login & Watch Ad", "Login to unlock 3 free premium
    downloads daily!", "Buy Credits", a "Close" control); Escape closes it, URL unchanged. Price **11** (lowest above 10): `Buy for
Ƶ11`, no Download; the dialog says "To buy this item you need 11 Zedge Credits", "Buy Zedge credits to unlock premium items", a
    package tile "2,000 / $ 1.99", "Already have an account? Log in" (`Log in`, href `#`), Cancel, Buy Credits; Cancel closes it,
    URL unchanged, "Buy for" still shown. The highest price (1410064408): `Buy for Ƶ1410064408`, the dialog repeats the number;
    Escape closes it, URL unchanged. The same item opened by direct URL shows the same state.
14. **A "Premium" item with no price downloads like a free one.** `/wallpapers/cd9975f5-c87c-45dc-91e8-e2010a4f6496` ("Fall") is
    listed under `?free=true` with a crown and no price badge; its detail page says "Premium", shows no price and only a
    "Download" button; the click starts the "Preparing your download" countdown and `fall.jpg` was downloaded (size not
    measured). See bug candidate 1.
15. **Category pages are linked.** The Explore block has 25 group headings and 200 links `a[href^="/category/wallpapers/"]`.
    `/category/wallpapers/animals`: title "[700+] Animals Wallpapers and Backgrounds | for Free" (the count changes), H1 "Animals
    wallpapers and backgrounds", 24 cards, **no filter bar**, a row of sub-category chips (`Animales`, `Giraffes`, ...), and the
    same Explore block below (210 links). The block heading says "wallpaper categories" (correct here, unlike the other areas).
16. **Errors.** An unknown category slug and an unknown item GUID both return **404** with H1 "Oops, couldn’t find it" and "Try the
    search keywords below, or check out this cool wallpaper!". `?categories=NOT_A_CATEGORY` and `?sort=BOGUS` both return
    **HTTP 500** with H1 "Oops, Something went wrong!" and an error code (bug candidate 5).
17. **Header for a guest.** Logo link `/ringtones-and-wallpapers`, `Categories`, scope chip, `Search Zedge` textbox, `Search`,
    `Upload`, an unnamed credits icon (`data-test-id="button-zCoin"`, opens "My Credits": "To view your credits", Log in, Buy
    Credits, five packages) and `Sign in`. Sign in and Upload both go to `https://account.zedge.net/v2/login?scope=ZEDGE`.
    The footer links Wallpapers, Ringtones, Live Wallpapers, AI Wallpaper Maker and legal pages.
18. **Console noise.** Blocked ad scripts on every page. `DialogContent requires a DialogTitle` was logged once per opened
    download dialog (seen on the download click in both contexts that downloaded). The cookie banner (Didomi) appears in every fresh context and
    intercepts clicks until rejected; this agrees with `dismissCookieBanner` in `src/utils/helper.ts`.

## Feature inventory

| Feature                                          | Seen live | Scenarios           | Notes                                                                       |
| ------------------------------------------------ | --------- | ------------------- | --------------------------------------------------------------------------- |
| List page: heading, filter bar, 24 cards, badges | yes       | WP-01               | crown / price consistency is one-directional (fact 3)                       |
| Header search, Wallpapers scope                  | yes       | WP-02, WP-03        | keyword in URL, H1 prefix, empty state                                      |
| Header search, default "All" scope               | yes       | WP-04               | leaves the section for `/find/<term>`                                       |
| Infinite scroll and Load more                    | yes       | WP-05, WP-06        | 24 -> 72 -> 96                                                              |
| Header "Categories" menu                         | yes       | WP-07               | 24 wallpaper categories                                                     |
| Explore block and category pages                 | yes       | WP-08               | linked from the list, no filter bar on the page                             |
| Category / Tag / Price / Color / Sort by         | yes       | WP-09, WP-11, WP-12 | Color is new compared with ringtones                                        |
| Reset All                                        | yes       | WP-10               | keeps `keyword` (bug candidate 6)                                           |
| Pairwise filters, Price range, deep link         | yes       | WP-13, WP-14, WP-15 |                                                                             |
| Detail page, tag chip, Related, Share            | yes       | WP-16..WP-19        | image preview, no audio                                                     |
| Free download                                    | yes       | WP-20               | JPEG after ~17 s countdown; A/B dialog variants                             |
| Premium gate (price 11+, price 10)               | yes       | WP-21, WP-22, WP-23 | two different gates                                                         |
| Premium item without a price                     | yes       | WP-24               | bug candidate, hold                                                         |
| 404 page                                         | yes       | WP-25               | needs a heading-agnostic `open`                                             |
| Not planned                                      | -         | -                   | Upload, Sign in, credits, Live Wallpapers, wallpaper maker, narrow viewport |

## Not applicable or cut

Compared with the sibling areas (ringtones, notification sounds), which have a plan:

| Sibling scenario                            | Why it does not apply here                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Audio preview (RT-17 / NS-16)               | No audio, no play button, no duration. The detail preview is an image; its load is part of WP-16.                 |
| Duration filter and slider                  | The wallpapers bar has Color instead of Duration. WP-09 / WP-11 cover Color.                                      |
| Download scenario with `.mp3`               | Wallpapers download a `.jpg`; the countdown dialog is the same family but varies by experiment variant (fact 12). |
| "Category pages are orphaned" (NS fact 14)  | Not orphaned here: the Explore block links to them (WP-08).                                                       |
| `Ringtone:` aria-label bug (NS candidate 4) | Not present: `aria-label` equals the title on all 24 cards.                                                       |

## Conventions

- Tags: `@wallpapers` and `@guest` on the `describe`; `@smoke` marks P1, `@regression` the rest; `@download` for real downloads;
  `@BUG:<JIRA-KEY>` for known bugs (none filed yet - see "Bug candidates").
- Bug tests assert the **current** behavior, carry `@BUG:<KEY>` and `{ type: 'bug', description }`, and are written only
  after the bug has a ticket.
- Seed: none. `tests/seed.spec.ts` does not exist (the planner setup creates a stub importing from `@playwright/test`; I deleted
  it). The Story decides whether a seed is needed.
- Free items are picked at run time from `?free=true` as the first card **without a crown** (fact 3, fact 14), never by title.

## Coverage Summary

| Status                     | Count  |
| -------------------------- | ------ |
| New                        | 25     |
| Bug documentation (`@BUG`) | 0      |
| **Total scenarios**        | **25** |

| Priority | Count |
| -------- | ----- |
| P1       | 7     |
| P2       | 12    |
| P3       | 6     |

## Test Scenarios

### 1. List Page

**Seed:** none

#### 1.1. WP-01 [P2][New][@regression] List page loads with header, filter bar and valid cards

**File:** `tests/wallpapers/wallpapers-list.spec.ts`

**Steps:**

1. Open /wallpapers
   - expect: H1 matching `/download hd phone wallpapers for free/i` is visible, URL is /wallpapers [verified-live]
2. Check the header: logo, Categories, scope chip + `Search Zedge` input + Search button, credits icon, Upload, Sign in
   - expect: all visible and enabled; no "Cancel" button while the input is empty [verified-live: button names read on a fresh page; enabled state: [assumed]]
3. Check the filter bar: label chip "Wallpapers", Category, Tag, Price, Color, Sort by
   - expect: all six visible; "Reset All" is not present [verified-live: names read; "Reset All" absent on the unfiltered page]
4. Check the first 24 cards (wait for the count to settle)
   - expect: every href matches `^/wallpapers/[a-f0-9-]{36}$`, every title is non-empty and equals the `aria-label`, every card has a background image [verified-live: all 24 via one DOM scan]
   - expect: every card with a price badge has a crown and a digits-only price [verified-live: 24 of 24, and in every list read in this session]
   - expect: "Load more" is not visible [verified-live]
   - Do not assert that every crown has a price (fact 3) and do not assert both free and premium cards exist.

### 2. Search

**Seed:** none

#### 2.1. WP-02 [P1][New][@smoke] Search by single and multi-word keywords (Wallpapers scope)

**File:** `tests/wallpapers/wallpapers-search.spec.ts`

Data-driven: `dragon` and `dark forest`. The scope is selected in the header chip ("Wallpapers" option) before typing.

**Steps:**

1. On /wallpapers choose the "Wallpapers" scope, type the term, press Search
   - expect: URL contains `/wallpapers?keyword=<encoded term>` [verified-live: `dragon`, `dark%20forest`]
   - expect: H1 starts with the term (`Dragon Download HD Phone Wallpapers For Free`), cards are rendered (count > 0), the input keeps the term, the chip reads "Wallpapers" [verified-live for `dragon` and `dark forest`: H1 and 24 cards; input and chip read for `dragon`]
   - expect: at least one title contains the term (single word) or one of its words (multi-word) [verified-live: `dragon` 17 of 24; `dark forest` first 6 titles all "forest"]

#### 2.2. WP-03 [P2][New][@regression] Search with no matches shows the empty state

**File:** `tests/wallpapers/wallpapers-search.spec.ts`

**Steps:**

1. Search (Wallpapers scope) for `zzzxxxqqqnonexistent123456`
   - expect: URL contains the encoded term [verified-live]
   - expect: heading "Couldn’t find anything" (`/couldn.?t find anything/i`) is shown [verified-live]
   - expect: no cards are rendered [verified-live]; the chip stays "Wallpapers" [verified-live]; no suggested keywords [assumed: not inspected]

#### 2.3. WP-04 [P2][New][@regression] Search with the default "All" scope opens the global results page

**File:** `tests/wallpapers/wallpapers-search.spec.ts`

**Steps:**

1. On a fresh /wallpapers (chip reads "All") search for `anime` without changing the scope
   - expect: [CONFIRM] URL path is `/find/anime`, the page leaves `/wallpapers` [verified-live]
   - expect: at least one wallpaper card (`/wallpapers/<GUID>`) is rendered [verified-live: 15]
   - expect: the chip still reads "All" and the input keeps the term [assumed: chip read after the search showed "All", input not read]
   - The oracle is the observed behavior; whether the chip should read "Wallpapers" on this page is bug candidate 10.

### 3. Infinite Scroll and Load More

**Seed:** none

#### 3.1. WP-05 [P1][New][@smoke] Auto-load on scroll preserves previous results

**File:** `tests/wallpapers/wallpapers-scroll.spec.ts`

**Steps:**

1. Open /wallpapers; record the card hrefs
   - expect: "Load more" is not visible, 24 cards [verified-live]
2. Scroll down gradually until "Load more" is visible (at most 6 rounds)
   - expect: the card count increases (24 -> 72 in the observed run) [verified-live]
   - expect: previous hrefs preserved in order, no duplicates [verified-live: first 24 unchanged, 0 duplicates]
   - expect: "Load more" becomes visible and enabled [verified-live]

#### 3.2. WP-06 [P2][New][@regression] "Load more" loads more cards and re-enables auto-loading

**File:** `tests/wallpapers/wallpapers-scroll.spec.ts`

**Steps:**

1. Scroll until "Load more" is visible; record hrefs; click it
   - expect: card count increases (72 -> 96 observed) [verified-live]
   - expect: previous hrefs preserved in order, no duplicates [verified-live]
2. Scroll to the last card 3 times
   - expect: each scroll appends cards, previous hrefs preserved, no duplicates [assumed: not run after the click]
   - Stop here; do not test for an end of results.

### 4. Category Navigation

**Seed:** none

#### 4.1. WP-07 [P1][New][@smoke] Header "Categories" menu opens a category in the list page

**File:** `tests/wallpapers/wallpapers-category-nav.spec.ts`

**Steps:**

1. Click the header "Categories" button
   - expect: a dialog "Categories" opens with 24 links `/wallpapers?categories=...` in the Wallpapers group [verified-live]
2. Click "Nature" in that group
   - expect: URL is `/wallpapers?categories=NATURE`, the dialog closes [verified-live]
   - expect: cards are rendered (count > 0) and the chip row shows "Nature" and "Reset All" [verified-live: 24 cards]
   - The group names Wallpapers / Ringtones / Notification Sounds are asserted by text only [verified-live for the first two; the third by its 28 links].

#### 4.2. WP-08 [P2][New][@regression] "Explore different wallpaper categories" opens a category page

**File:** `tests/wallpapers/wallpapers-category-nav.spec.ts`

**Steps:**

1. On /wallpapers scroll to the H2 "Explore different wallpaper categories"
   - expect: the H2 is visible and the block has links `/category/wallpapers/<slug>` (count > 0; 200 seen in 25 groups) [verified-live]
2. Click the group link "Animals"
   - expect: URL is `/category/wallpapers/animals`, document title matches `/Animals Wallpapers and Backgrounds/` (the "[700+]" prefix changes) [verified-live]
   - expect: H1 matches `/animals wallpapers and backgrounds/i`, cards are rendered (count > 0), the filter bar (Category / Price / Sort by) is **not** present [verified-live: 24 cards, filter bar absent]
   - expect: sub-category chips `a[href^="/category/wallpapers/"]` are shown [verified-live: 10 read]
   - Do not assert chip names (noisy, multilingual) and do not click a sub-category chip [assumed: not clicked].

### 5. Filtering

**Seed:** none

#### 5.1. WP-09 [P1][New][@smoke] Each filter applied alone updates results and URL

**File:** `tests/wallpapers/wallpapers-filters.spec.ts`

Data-driven, one test per row, each starting from unfiltered /wallpapers:

| Filter   | Option                                  | URL contains        | Extra invariant                                       |
| -------- | --------------------------------------- | ------------------- | ----------------------------------------------------- |
| Category | Nature                                  | `categories=NATURE` | chip "Nature" shown                                   |
| Tag      | first option in the dialog (contextual) | `tags=<that tag>`   | chip with the tag shown                               |
| Price    | Free                                    | `free=true`         | no card has a price badge (a crown may exist, fact 3) |
| Price    | Paid                                    | `paid=true`         | every card has a crown and a digits price             |
| Color    | Black                                   | `colors=black`      | chip "Black" shown                                    |
| Sort by  | Most popular                            | `sort=POPULAR`      | first card hrefs differ from the baseline             |

**Steps:**

1. Record baseline card hrefs, apply the filter option (close the dropdown with `closeFilter()`)
   - expect: URL contains the param from the table [verified-live through the UI for all six rows]
   - expect: card hrefs differ from the baseline, count > 0 [verified-live: all six, first 3 hrefs compared]
   - expect: the extra invariant holds [verified-live: chips "Nature" (menu and dropdown), "bmw", "Free", "Black"; Free 0 of 24 priced; Paid 24 of 24 crown + price; Sort: first hrefs differ]
   - The Tag option is read from the dialog at run time: the list is contextual (10 options on the unfiltered list).

#### 5.2. WP-10 [P1][New][@smoke] Reset All clears every active filter

**File:** `tests/wallpapers/wallpapers-filters.spec.ts`

**Steps:**

1. On unfiltered /wallpapers
   - expect: "Reset All" is not present [verified-live]
2. Apply two Tag options and two Color options (and Category Nature, Space)
   - expect: "Reset All" is visible; URL is `?tags=bmw%2Ccar&colors=red%2Cblue` for the Tag and Color pair [verified-live]; Category pair: URL `categories=NATURE%2CSPACE` [verified-live separately]
3. Click "Reset All"
   - expect: URL is `/wallpapers` without filter params (`categories`, `tags`, `free`, `paid`, `minPrice`, `maxPrice`, `colors`, `sort`) [verified-live for the Tag + Color case]
   - expect: "Reset All" disappears [verified-live]; card hrefs change [assumed: not compared after the reset]
   - Do not start from a keyword search: Reset All keeps `keyword` and stays visible (bug candidate 6).

#### 5.3. WP-11 [P2][New][@regression] Multiple options in Category, Tag and Color

**File:** `tests/wallpapers/wallpapers-filters.spec.ts`

**Steps:**

1. Select Category Nature, then Space
   - expect: URL has `categories=NATURE%2CSPACE`; both options have `aria-checked="true"`; chips "Nature" and "Space" [verified-live]
2. Uncheck Space
   - expect: only Nature stays selected and in the URL [verified-live]
3. Select two Tag options
   - expect: both have `aria-selected="true"` and both tags are in the URL (`tags=bmw%2Ccar`), chips for both [verified-live]
4. Select Color Red, then Blue
   - expect: URL has `colors=red%2Cblue` [verified-live]; both options are checked and both chips shown [assumed: only the URL was read]
5. Uncheck one Tag and one Color
   - expect: only the other stays selected and in the URL [assumed: unchecking was verified for Category only]

#### 5.4. WP-12 [P2][New][@regression] Sort by orders cards and updates the URL

**File:** `tests/wallpapers/wallpapers-filters.spec.ts`

Data-driven:

| Sort option        | Starting point            | URL contains      | Invariant                                                          |
| ------------------ | ------------------------- | ----------------- | ------------------------------------------------------------------ |
| Newest first       | unfiltered                | `sort=NEWEST`     | chip "Newest first", hrefs differ from the baseline                |
| Price: High to Low | Price=Paid                | `sort=PRICE_DESC` | every card priced; prices non-increasing across the 24 cards       |
| Price: Low to High | `minPrice=11` (no `paid`) | `sort=PRICE_ASC`  | prices non-decreasing across the 24 cards, first price at least 11 |
| Most popular       | unfiltered                | `sort=POPULAR`    | hrefs differ from the baseline (also in WP-09)                     |

**Steps:**

1. Apply the starting filter, record hrefs, choose the sort option from the "Sort by" menu
   - expect: URL contains the param, the option is checked on reopen [verified-live for the URL and the cards of all four; "checked on reopen": only the default "Relevance" was read checked, and the deep-link case in WP-15 showed "Price: High to Low" checked]
   - expect: the invariant holds [verified-live: High to Low `1410064408 ... 100000` non-increasing; Low to High `11,11,...,12`; Newest and Most popular: hrefs differ]
2. Choose "Relevance"
   - expect: the `sort` param disappears [assumed: not run]
   - Do not assert the top price value (live data, `1410064408` seen) and do not sort an unfiltered list by price and assert prices: the first 24 are all free.

#### 5.5. WP-13 [P2][New][@regression] Pairwise filter combinations

**File:** `tests/wallpapers/wallpapers-filters.spec.ts`

Data-driven, one test per pair, each from unfiltered /wallpapers:

| Pair                                    | Invariant after both filters                                       |
| --------------------------------------- | ------------------------------------------------------------------ |
| Category=Animals + Price=Free           | both in URL; chips "Animals" and "Free"; no card has a price badge |
| Price=Paid + Sort by=Price: High to Low | both in URL; every card has a price; prices non-increasing         |
| Color=Black + Sort by=Newest first      | both in URL; chips "Black" and "Newest first"                      |

**Steps:**

1. Apply the first filter, record hrefs, apply the second
   - expect: both params are in the URL [verified-live: `categories=ANIMALS&free=true`, `paid=true&sort=PRICE_DESC`, `colors=black&sort=NEWEST`]
   - expect: the invariant holds [verified-live: Animals + Free 0 of 24 priced, chips as listed; Paid + High to Low 24 of 24 priced, non-increasing; Black + Newest chips]
   - expect: hrefs change after each filter [verified-live for the three pairs]
   - Do not pair Paid with a price range (bug candidate 3).

#### 5.6. WP-14 [P2][New][@regression] Price range From / To limits card prices

**File:** `tests/wallpapers/wallpapers-filters.spec.ts`

**Steps:**

1. Open the Price filter, set From = 50 (commit with Tab, wait for `minPrice=50`), then To = 500 (wait for `maxPrice=500`)
   - expect: URL has `minPrice=50` and `maxPrice=500`; chips "From: 50 Ƶ" and "To: 500 Ƶ" [verified-live]
   - expect: every rendered card has a crown and a price between 50 and 500 inclusive [verified-live: 24 cards, every one priced, prices 80..500; the crown was not read on its own, the price implies it (fact 3)]
   - Each value is committed on its own: after From alone the URL is `minPrice=50&maxPrice=NaN` (bug candidate 2).
   - A range below 11 is useless: every paid card in the default order costs 10.

#### 5.7. WP-15 [P3][New][@regression] Filters are restored from a deep link

**File:** `tests/wallpapers/wallpapers-filters.spec.ts`

**Steps:**

1. Navigate to `/wallpapers?categories=NATURE&colors=black&sort=PRICE_DESC&minPrice=11&tags=halloween` (through the entry page `open(path)`)
   - expect: chips "Nature", "halloween", "Black", "From: 11 Ƶ", "Price: High to Low" and "Reset All" are shown, 24 cards [verified-live]
   - expect: every card price is at least 11 and the first 10 prices are non-increasing [verified-live with the three-param link `categories=NATURE&sort=PRICE_DESC&minPrice=11`: `1000000, 500000, 200000, ...`; with the five-param link only chips and the count were read]
   - expect: the Category dialog shows Nature checked, Sort by shows "Price: High to Low" checked, the Price dialog shows From = 11 [verified-live on the three-param link]

### 6. Wallpaper Detail Page

**Seed:** none

#### 6.1. WP-16 [P2][New][@regression] Free wallpaper detail page

**File:** `tests/wallpapers/wallpaper-detail.spec.ts`

**Steps:**

1. Apply Price=Free and open the first card without a crown
   - expect: URL equals the card's href, H1 equals the card's title [verified-live: by href on a free item; by click on two premium items]
   - expect: document title contains the item title and `wallpaper by` [verified-live]
   - expect: artist link `a[href^="/profiles/"]`, a "<N> Downloads" text (`< 10 Downloads` seen) and at least one keyword chip are shown [verified-live]
   - expect: the preview image is loaded (`naturalWidth` > 0) [verified-live: 673x1206]
   - expect: no "Premium" text and no "Buy for" button; one visible "Download" button [verified-live]
   - Do not assert a description (not every item has one) or the `alt` text (empty, bug candidate 8).

#### 6.2. WP-17 [P3][New][@regression] Tag chip on the detail page opens a keyword search

**File:** `tests/wallpapers/wallpaper-detail.spec.ts`

**Steps:**

1. Open any card, click its first keyword chip
   - expect: URL is `/wallpapers?keyword=<tag>`, cards are rendered, the search input contains the tag, H1 starts with the tag [verified-live: `llama`, 24 cards, input `llama`]. Other tags may return fewer than 24.

#### 6.3. WP-18 [P3][New][@regression] Related section renders valid cards

**File:** `tests/wallpapers/wallpaper-detail.spec.ts`

**Steps:**

1. Open any card, scroll gradually to "Related"
   - expect: heading "Related" and cards are shown; none of the related hrefs equals the open item [verified-live: 24 cards, 0 self-links]
   - expect: card invariants from WP-01 hold [assumed: only the count and the number of priced cards were read]

#### 6.4. WP-19 [P3][New][@regression] Share button opens the share dialog

**File:** `tests/wallpapers/wallpaper-detail.spec.ts`

**Steps:**

1. Open any card, click the visible Share button (`button[data-event="SHARE_CONTENT"]`, the first visible one; there are two in the DOM)
   - expect: dialog "Share item" with a "Copy" button opens, URL unchanged [verified-live]
2. Press Escape
   - expect: the dialog closes [assumed: Escape was sent but the result was not read]
   - Do not click Copy (clipboard in headless is not verified).

### 7. Download and Purchase (Guest)

**Seed:** none

#### 7.1. WP-20 [P1][New][@smoke][@download] Free wallpaper downloads after the countdown

**File:** `tests/wallpapers/wallpapers-download.spec.ts`

**Steps:**

1. Apply Price=Free, open the first card without a crown, start waiting for the `download` event (timeout at least 40 s), click "Download"
   - expect: dialog "Preparing your download" with a countdown number and "Please wait a few moments for the download to begin" [verified-live; the number was 13-14, do not assert it]
   - expect: no "Unlock and Support the Artist" modal [verified-live]
   - Do not assert "Downloads left today", "Get the App" or the countdown value: they depend on the experiment variant (fact 12).
2. Wait for the download
   - expect: `suggestedFilename` ends with `.jpg`, the saved file is not empty and starts with the JPEG magic `ff d8 ff` (1.05-1.36 MB observed) [verified-live: 5 measured downloads in 2 contexts, one per variant]
   - expect: the dialog closes by itself [verified-live: gone 1.5 s after the download]
   - Save into a per-test folder; one download per test keeps well inside the variant A quota of 3 per session.

#### 7.2. WP-21 [P1][New][@smoke] Premium wallpaper above 10 credits shows its price and the purchase gate

**File:** `tests/wallpapers/wallpapers-purchase.spec.ts`

Data-driven:

| Variant       | How to pick the card                                                        | Closing control |
| ------------- | --------------------------------------------------------------------------- | --------------- |
| Lowest price  | `minPrice=11` (no `paid=true`), Sort by=Price: Low to High, first (11 seen) | Cancel          |
| Highest price | Price=Paid, Sort by=Price: High to Low, first (1410064408 seen)             | Escape          |

Price 10 is excluded on purpose (see WP-22).

**Steps:**

1. Pick the card, record its price, open it
   - expect: "Premium" and a button "Buy for Ƶ<price>" matching the card price, no "Download" button [verified-live: both variants]
2. Click "Buy for Ƶ<price>"
   - expect: dialog "To buy this item you need <price> Zedge Credits", a "Log in" link, Cancel and Buy Credits [verified-live: both variants]
   - Do not assert the credits-package tile, do not click Buy Credits or Log in.
3. Close the dialog (Cancel for the first variant, Escape for the second)
   - expect: dialog closes, URL unchanged, "Buy for Ƶ<price>" still shown [verified-live: both variants]

#### 7.3. WP-22 [P2][New][bug candidate][@regression] Premium wallpaper priced 10 offers the watch-ad unlock instead of Buy

**File:** `tests/wallpapers/wallpapers-purchase.spec.ts`

**[bug candidate].** Same inconsistency as NS-19, RT-20 and ZED-3 (a Premium item priced 10 shows "Download" instead of "Buy for Ƶ10").
Per the human's 2026-10-01 decision on ringtones it is treated as a bug, but **not filed for this area**: it waits for
`gate: file bug`, then ticket, triage, repro, and only then a `@BUG:<KEY>` test with `{ type: 'bug', description }` asserting
the current behavior. Until then no test is written.

**Steps:**

1. Open a premium item priced 10 (`paid=true`, first card with price 10)
   - expect: "Premium", "10" and a visible "Download" button, no "Buy for" button [verified-live: 1 sample, "Halloween"]
2. Click "Download"
   - expect: dialog "Unlock and Support the Artist" with "Login & Watch Ad", "Login to unlock 3 free premium downloads daily!" and "Buy Credits" [verified-live]
3. Close the dialog
   - expect: dialog closes, URL unchanged [verified-live: via Escape; the "Close" control exists, not clicked]
   - expect: no download starts [assumed: no `download` listener was attached]

#### 7.4. WP-23 [P3][New][@regression] Opening a premium wallpaper by direct URL keeps the gate

**File:** `tests/wallpapers/wallpapers-purchase.spec.ts`

**Steps:**

1. Take the href of the first card from `minPrice=11`, Sort by=Price: Low to High; open a new page and go to that href
   - expect: "Premium", the price and "Buy for Ƶ<price>" are shown [verified-live: the item was opened by click first and by href second, both showed "Buy for Ƶ11"]
   - expect: the same state as when opened from the list [verified-live: same text and buttons in both openings, not compared field by field]

#### 7.5. WP-24 [P2][New][bug candidate][@regression] A "Premium" wallpaper without a price is listed as free and downloads

**File:** `tests/wallpapers/wallpapers-purchase.spec.ts`

**[bug candidate].** Under `?free=true` some cards carry a crown but no price badge (fact 3); the detail page of one says "Premium"
with no price and offers a plain "Download" that runs the free countdown and delivers a file (fact 14). Either the crown/"Premium"
label is wrong or the item should not be free. Waits for `gate: file bug`. **Data-dependent:** such cards appear on some pages
only (1-4 of 24) and CLAUDE.md forbids a conditional in a test body, so a test would have to pin the item by GUID
(`cd9975f5-c87c-45dc-91e8-e2010a4f6496` today), which breaks when it is removed. Recommend: keep it as a ticket and a note, write
no test unless the human wants a pinned one.

**Steps:**

1. Open `?free=true`, find a card with a crown and no price badge (reading all 24)
   - expect: such a card exists [verified-live: 1 of 24 on the first read; not guaranteed on every load]
2. Open it
   - expect: "Premium", no price, one "Download" button, no "Buy for" [verified-live: "Fall"]
3. Click "Download"
   - expect: "Preparing your download" countdown and a file download, no gate [verified-live: `fall.jpg` received; size not measured]

### 8. Unknown Item

**Seed:** none

#### 8.1. WP-25 [P3][New][@regression] Unknown wallpaper shows the not-found page

**File:** `tests/wallpapers/wallpaper-detail.spec.ts`

**Steps:**

1. Go to `/wallpapers/00000000-0000-0000-0000-000000000000`
   - expect: HTTP status 404, H1 "Oops, couldn’t find it", the text "Try the search keywords below" and at least one keyword link [verified-live: status, H1 and text; keyword links read as plain text, not as `href`s: [assumed]]
   - expect: no cards from the Wallpapers grid are rendered [verified-live: 0]
   - `open(path)` waits for the list heading and cannot be used on this page; the Story decides between a heading-agnostic variant and a dedicated `NotFoundPage`. A malformed filter value (`?sort=BOGUS`) returns 500 and is bug candidate 5, not a scenario.

## Bug candidates

Notes only, no tickets. Each needs `gate: file bug` before a ticket and a `@BUG:<KEY>` test.

1. **[bug candidate] Premium crown without a price under the Free filter.** `?free=true` shows 1-4 cards of 24 with a crown and no
   price (also under `tags=` and `colors=`); the detail page of "Fall" says "Premium" and downloads like a free item (WP-24).
2. **[bug candidate] `maxPrice=NaN` when only "From" is set.** From=50 gave `?minPrice=50&maxPrice=NaN`. Same as ringtones and
   notification sounds.
3. **[bug candidate / CONFIRM] `minPrice` is ignored when `paid=true`.** `?paid=true&minPrice=11&sort=PRICE_ASC` returned 24 cards
   priced 1 with the chip "From: 11 Ƶ"; without `paid=true` the same params returned prices from 11. Same family as NS candidate 5.
4. **[bug candidate] Price-10 premium items show Download, not Buy** (WP-22), same as RT-20 / ZED-3 / NS-19.
5. **[bug candidate] Malformed query values return HTTP 500.** `?categories=NOT_A_CATEGORY` and `?sort=BOGUS` give "Oops, Something
   went wrong!" with an error code and status 500 (one request each; an unknown slug or GUID correctly gives 404).
6. **[CONFIRM] Reset All keeps the keyword.** With `?keyword=dragon&free=true`, "Reset All" removes `free` but leaves
   `keyword=dragon` and stays visible; a second click changes nothing. Same as ringtones RT fact 8.
7. **[bug candidate, low] `DialogContent requires a DialogTitle`** console error when the download dialog opens (once per click).
   Filter for "DialogTitle".
8. **[low] Missing accessible names.** The Share button and the header credits icon have no name; the main preview `img` has an
   empty `alt`.
9. **[low / CONFIRM] Absurd prices.** The top item of Price: High to Low costs 1,410,064,408 credits, shown unformatted in the card
   and the Buy button. It is live data, not an oracle.
10. **[CONFIRM] The header scope chip reads "All" on `/wallpapers`**, and a search with it leaves the section for `/find/<term>`
    (WP-04). Same chip behavior as the sibling areas.

Not verified and not used as an oracle: the behavior of variant A at "0 downloads left" (not probed), and whether the experiment
variant can be pinned with a cookie (see Go / no-go).

## Reuse map

CLAUDE.md names the shared components and the wallpapers page objects as existing; **none is on disk** (premise check 1). The
column "Needed" lists what the Story must create. Names follow CLAUDE.md so the later areas (ringtones, notification sounds)
reuse them rather than copy them.

| Scenario group            | Existing today                                                                                                                 | Needed (new)                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wiring (all)              | `fixtures/test.ts` (`rejectCookieConsent`, `blockAds`), `dismissCookieBanner`, `TIMEOUTS`, tag `@wallpapers` and the Areas row | `app` fixture and `AppPageObjects` (`wallpapersListPage`), `tests/wallpapers/`, ESLint area rules; `clearDownloadFolder` exists in `src/utils/helper.ts` for WP-20                                              |
| Entry, list (WP-01)       | `dismissCookieBanner`                                                                                                          | `WallpapersListPage` with `open(path)` (navigate, wait for the list heading, `dismissCookieBanner`), shared `HeaderPage`, `FooterPage`/`MainHeaderPage` in `pages/`                                             |
| Cards (WP-01, 05, 06, 18) | -                                                                                                                              | cards component (settled count, `validateFirst`) with the href prefix as a parameter; shared `CardLinkValidator`; scroll / "Load more" helper                                                                   |
| Search (WP-02..04)        | -                                                                                                                              | `HeaderPage.search(value, scope)` (scope = "All" / "Wallpapers" / "Ringtones" / "Notification Sounds" / "Artists"); `noResultsHeading` on the list page                                                         |
| Category nav (WP-07, 08)  | -                                                                                                                              | `HeaderPage` categories dialog + `selectCategory`; an Explore-block component and a `CategoryPage` (no filter bar)                                                                                              |
| Filters (WP-09..15)       | -                                                                                                                              | `filtersBar` component: Category / Tag (combobox) / Price (options + From/To menuitems) / Color / Sort by, `closeFilter()` (Escape), chips, `Reset All`; types for `SortByType`, `PriceOptionType`, `ColorType` |
| Detail (WP-16..19, 25)    | -                                                                                                                              | `WallpaperDetailPage` (artist, downloads text, keyword chips, preview image, Related cards, Share button); a not-found variant                                                                                  |
| Download (WP-20)          | `clearDownloadFolder`                                                                                                          | `downloadFlow` component on the list page: dialog, `download` event (timeout 40 s+), `.jpg`, JPEG magic; must not assert the quota line                                                                         |
| Purchase (WP-21..24)      | -                                                                                                                              | `BuyModalPage` (shared, `pages/`): "Buy for" dialog (Log in / Cancel / Buy Credits) and the "Unlock and Support the Artist" gate                                                                                |

Because wallpapers come first, the card validator, the header and the buy modal must be written parameterised from the start
(href prefix, scope names), so the next area does not trigger a `[dup-pom]` finding.

## Go / no-go

**Go**, with one precondition and the cuts below.

- **Does a guest see free items?** Yes. 8 of the first 24 had no price badge; `?free=true` returned 24 cards without price
  badges [verified-live]. Some of those carry a crown (fact 3), so pick a card with no crown.
- **Does a free item really download?** Yes: a real JPEG (1.05-1.36 MB, magic `ff d8 ff e0`) about 16.8 s after the click, after
  a "Preparing your download" countdown, no ad or login, 5 measured downloads in 2 contexts [verified-live]. WP-20 needs a test timeout of
  at least 40 s. **Risk:** the dialog differs by experiment variant (A shows a daily counter of 3, CG does not). One download per
  test stays inside the quota, but `web_download_limit_v2` is a flag the site can change: assert only the shared elements. Whether
  the variant can be pinned with the `zedgeExperiments_marketplace` cookie is [assumed] and worth a look in the Story.
- **Does a preview play headless?** Not applicable: wallpapers have a static preview image (loaded, 673x1206); there is no audio
  or video to play. Nothing is cut for that.
- **Precondition:** the repository has no page objects, no `app` fixture and no tests (premise check 1). The Story must start
  with the wiring and shared components; this is the largest piece of work and it is also why the first group should stay small.

Cuts and holds: WP-22 and WP-24 are `[bug candidate]` notes waiting for `gate: file bug`; WP-24 should stay a note (data-dependent,
needs a pinned GUID); WP-25 waits for a decision on how `open(path)` works for a page without the list heading; no audio, no
narrow-viewport scenario; Upload, Sign in, credits dialog, Live Wallpapers, wallpaper maker, Ringtones, Notification Sounds,
Artists search and profile pages are out of scope. Recommendation: write the Story for WP-01..WP-21, WP-23 and WP-25 (23
scenarios), with WP-22 and WP-24 attached to bugs. Start with list + search only (WP-01..WP-04) so the wiring and the shared
page objects are reviewed before the filter and download work.
