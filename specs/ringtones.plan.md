# Ringtones Section Test Plan

Status: approved 2026-10-01

Pilot dry run: the first group is list + search only (RT-01, RT-02, RT-03). The other groups follow after the pilot.

## Application Overview

Scope: the Ringtones section of zedge.net - list page (`/ringtones`), header search with the "Ringtones" filter, category
navigation (header "Categories" menu and the "Explore different ringtone categories" block at the bottom of `/ringtones`),
list filters (Category / Tag / Price / Duration / Sort by / Reset All), infinite scroll and "Load more", the audio preview
control, the ringtone detail page, free download, and the premium purchase gate.

Constraints:

- Guest user only, free content only. Every purchase or sign-in flow stops once the dialog is verified.
- Desktop viewport only (Desktop Chrome project).
- Live production site, headless browsers only.
- No security testing (XSS, SQL injection, fuzzing) and no load or performance testing.
- Content is live: assert invariants (URL params, badges, prices, counts > 0, href changes), never a specific title or
  exact count. Ringtones are identified by their `href` (`/ringtones/<GUID>`).
- Out of scope: Notification Sounds, Artists search, `/profiles/<GUID>` pages, share, "Download app" tiles, narrow viewport.

## Revision log

- v1 (2026-10-01): drafted by `playwright-test-planner`, then every expected result re-checked by hand through the
  Playwright MCP (headless, guest, production). Each expected result carries `[verified-live]` (seen in this session) or
  `[assumed]` (not seen). Facts the draft got wrong were corrected here (see "Corrections to the draft").

## Verified facts (used as the test oracle)

All `[verified-live]` on 2026-10-01 unless noted.

1. **List page.** H1 "Download The Best Mobile MP3 Ringtones For Free". Filter bar: a non-filter label chip `Ringtones`, then
   `Category`, `Tag`, `Price`, `Duration`, `Sort by`. Wallpapers has `Color` where ringtones has `Duration`. **Tag is a
   `combobox`, not a button.** The site redirects to `www.zedge.net`.
2. **Cards.** 24 on first load. `a[href^="/ringtones/<GUID>"]` inside the same `CardsContainer` / `A_link` markup the
   wallpapers list uses. `title="<title>"`, `aria-label="Ringtone: <title>"`, a `button[title="Play audio"]`, a duration
   `p[data-size="sm"]` like `30 s`. No artist and no download count on the card.
3. **Price badge.** A card with `div[class*="card-footer"]` has a digits-only price badge and a crown
   (`div[class*="card-header"]`). **A crown can appear without a price badge**: `?categories=POP&free=true` returned two
   "Silver Morning" cards with a crown and no footer; their detail pages show "Premium" and a "Download" button. So
   "every crown card has a price" is **not** a safe invariant; "a card with a price badge has a crown and digits" is.
   Free-filter invariant: no card has a price badge.
4. **Search.** The header chip is **"All" on a fresh `/ringtones`**. Options: All, Wallpapers, Ringtones, Notification
   Sounds, Artists (`menuitemradio`). With "Ringtones" the URL is `/ringtones?keyword=<term>` and the H1 gets the keyword as
   a prefix. No match: H2 `Couldn’t find anything` (typographic apostrophe), 0 cards, **no suggested keywords** (unlike the
   `/find/<term>` empty state of the "All" scope).
5. **Categories menu.** `dialog` named "Categories" with three groups (`/wallpapers`, `/ringtones`, `/notification-sounds`
   links); the Ringtones group has 28 links `a[href="/ringtones?categories=<ENUM>"]` (`POP`, `ENTERTAINMENT`, ...).
6. **Filters and URL params.**

   | Control  | Options                                                                          | Mode   | URL param                                                  |
   | -------- | -------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
   | Category | 28 options (`role=option`, `aria-checked`)                                       | multi  | `categories=ANIMALS%2CGAMES`                               |
   | Tag      | contextual list (~10, depends on other filters; `role=option`, `aria-selected`)  | multi  | `tags=country%2Ccountry+music+ring+tones`                  |
   | Price    | Free, Paid (options); From, To (`menuitem`, placeholders "From"/"To")            | -      | `free=true`, `paid=true`, `minPrice=`, `maxPrice=`         |
   | Duration | From, To (`menuitem`, names "Minimum/Maximum duration in seconds") + slider 0-30 | -      | `minDuration=`, `maxDuration=`                             |
   | Sort by  | Relevance, Newest first, Price: Low to High, Price: High to Low, Most popular    | single | `sort=PRICE_DESC`, `sort=POPULAR` (Relevance has no param) |

   Dialogs are found by name: `getByRole('dialog', { name: 'Category' | 'Price' | 'Duration' | 'Sort by' })`. The Tag dialog
   was found with a bare `getByRole('dialog')`. Applied filters show as chips in `main` plus `Reset All`.

7. **Tag results are not title-based.** With Animals + Games + tag `country`, only 4 of the first 10 titles contained
   "country". Assert URL and changed cards, never titles.
8. **Reset All** clears every filter param but **keeps `keyword`**.
9. **Scroll.** 24 cards, one gradual scroll round -> 72, "Load more" appears; clicking it -> 96; one more gradual scroll -> 168. Hrefs preserved in order, no duplicates. Plain big `mouse.wheel` jumps stalled at 48: use gradual scrolling
   (step 200, delay 300), as the wallpapers `scrollDownGradually` does.
10. **Category pages.** `/category/ringtones/<slug>` (209 links in the Explore block). H1 "<Name> Ringtones Free Download",
    24 cards, a row of sub-filter chips `main h1 + div a` (10 on Blues) that changes the URL, H1 and cards.
11. **Audio preview.** No `<audio>` element in the DOM. Play state is `[class*="card-audio-progress"]` inside the card with
    `data-playing="true|false"` and a growing `style.width` (8% after 2.5 s). The button `title` stays "Play audio" in
    both states (no `aria-pressed`). The detail page has the same player markup.
12. **Free download.** "Download" opens a `dialog` "Preparing your download" with a countdown (15 in this session, 6 in the
    exploring agent's - do not assert the number), then a real download fires: `pickup.mp3`, 481207 bytes, `ID3` header.
    **No "Unlock and Support the Artist" modal** for a free ringtone (unlike wallpapers).
13. **Premium gate depends on price.** Default paid list: 24 of 24 cards cost 10. Price **10**: 5 of 5 sampled detail pages
    show "Premium" + "Download" and no Buy button; Download opens "Unlock and Support the Artist" (artist, "Login & Watch
    Ad", "Login to unlock 3 free premium downloads daily!", "Buy Credits", Close). Price **> 10** (first card of
    `minPrice=11&sort=PRICE_ASC` = 15): "Buy for Ƶ15" and no Download; the modal says "To buy this item you need 15 Zedge
    Credits" with "Log in", Cancel, Buy Credits. Cancel and Escape close it, URL unchanged.
14. **Detail page.** H1 = card title, artist link `a[href^="/profiles/"]`, "<N> Downloads" text, tag chips
    `a[href^="/ringtones?keyword=<tag>"]`, a player, Share/Download/Buy buttons rendered twice in the DOM (one hidden: use
    `:visible`). "Related" appears only after scrolling (24 cards).

## Corrections to the draft

- Duration and Price From/To are `menuitem` inputs; Duration's accessible names are "Minimum/Maximum duration in
  seconds", not "From"/"To".
- The "Buy" modal at price 15 has **no credits-package selector** (the exploring agent saw one at price 50). Do not assert
  it, and do not call `BuyModalPage.validatePurchaseModalDialog` as is (it requires the package button).
- Crown without a price badge exists on free items (fact 3).
- Tag filter is multi-select (the draft had not checked); tag results are not title-based (fact 7).
- The draft said "Reset All does nothing when only a keyword is active" - not re-verified, left out of the oracle.

## Conventions

- Tags: `@ringtones` and `@guest` on the `describe`; `@smoke` marks P1, `@regression` the rest; `@download` for real
  downloads; `@BUG:<JIRA-KEY>` for known bugs (none filed yet - see "Bug candidates").
- Bug tests assert the **current** behavior, carry `@BUG:<KEY>` and `{ type: 'bug', description }`, and are written only
  after the bug has a ticket.
- Seed: `tests/seed.spec.ts` (wallpapers only today; the Story decides whether ringtones needs its own seed).

## Coverage Summary

| Status                     | Count  |
| -------------------------- | ------ |
| New                        | 21     |
| Bug documentation (`@BUG`) | 0      |
| **Total scenarios**        | **21** |

| Priority | Count |
| -------- | ----- |
| P1       | 7     |
| P2       | 10    |
| P3       | 4     |

## Test Scenarios

### 1. List Page

**Seed:** `tests/seed.spec.ts`

#### 1.1. RT-01 [P2][New][@regression] List page loads with header, filter bar and valid cards

**File:** `tests/ringtones/ringtones-list.spec.ts`

**Steps:**

1. Open /ringtones
   - expect: H1 is visible and contains "Ringtones", URL is /ringtones [verified-live]
2. Check the header: logo, Categories, search chip + input + Search button, credits button, Sign in
   - expect: all visible and enabled with the existing `HeaderPage` locators; the cancel control is absent while the input is empty [verified-live]
3. Check the filter bar: label chip "Ringtones", Category, Tag, Price, Duration, Sort by
   - expect: all six visible; "Reset All" is not present [verified-live]
4. Check the first 24 cards
   - expect: every href matches `^/ringtones/[a-f0-9-]{36}$` [verified-live]
   - expect: every title is non-empty and `aria-label` equals `Ringtone: <title>` [verified-live]
   - expect: every card has a play button and a duration matching `^\d+ s$` [verified-live]
   - expect: every card with a price badge has a crown and a digits-only price; a card without a footer has no price badge [verified-live]
   - Do not assert that both free and premium cards exist, and do not assert that a crown always has a price (fact 3).

### 2. Search

**Seed:** `tests/seed.spec.ts`

#### 2.1. RT-02 [P1][New][@smoke] Search by single and multi-word keywords (Ringtones scope)

**File:** `tests/ringtones/ringtones-search.spec.ts`

Data-driven: `piano` and `love song`. The "Ringtones" scope is selected through `HeaderPage.search(value, 'Ringtones')`.

**Steps:**

1. On /ringtones search for the term with the "Ringtones" filter
   - expect: URL contains `/ringtones?keyword=<encoded term>` [verified-live]
   - expect: cards are rendered (count > 0), the search input keeps the term, the chip reads "Ringtones" [verified-live]
   - expect: at least one title contains the term (single word) or one of its words (multi-word) [verified-live: 23 of 24 for `piano`; 19 of 24 contain "love" or "song", only 8 contain both]

#### 2.2. RT-03 [P2][New][@regression] Search with no matches shows the empty state

**File:** `tests/ringtones/ringtones-search.spec.ts`

**Steps:**

1. Search (Ringtones filter) for a nonsense term, e.g. `zzzxxxqqqnonexistent123456`
   - expect: URL contains the encoded term [verified-live]
   - expect: heading "Couldn’t find anything" (match `/couldn.?t find anything/i`) is shown [verified-live]
   - expect: no ringtone cards are rendered; there are no suggested keywords [verified-live]

### 3. Infinite Scroll and Load More

**Seed:** `tests/seed.spec.ts`

#### 3.1. RT-04 [P1][New][@smoke] Auto-load on scroll preserves previous results

**File:** `tests/ringtones/ringtones-scroll.spec.ts`

**Steps:**

1. Open /ringtones; "Load more" is not present; record the card hrefs
   - expect: "Load more" is not attached, 24 cards [verified-live]
2. Scroll down gradually until "Load more" is visible (at most 6 rounds)
   - expect: after each round the card count increases (24 -> 72 in the observed run) [verified-live]
   - expect: previous hrefs are preserved in the same order, no href appears twice [verified-live]
   - expect: "Load more" becomes visible and enabled [verified-live]

#### 3.2. RT-05 [P2][New][@regression] "Load more" loads more cards and re-enables auto-loading

**File:** `tests/ringtones/ringtones-scroll.spec.ts`

**Steps:**

1. Scroll until "Load more" is visible; record hrefs; click it
   - expect: card count increases (72 -> 96 observed) [verified-live]
   - expect: previous hrefs preserved in order, no duplicates [verified-live]
2. Scroll to the last card 3 times
   - expect: each scroll appends cards (96 -> 168 observed after the first), previous hrefs preserved, no duplicates [verified-live]
   - Stop here; do not test for an end of results.

### 4. Category Navigation

**Seed:** `tests/seed.spec.ts`

#### 4.1. RT-06 [P1][New][@smoke] Header "Categories" menu opens a category in the list page

**File:** `tests/ringtones/ringtones-category-nav.spec.ts`

**Steps:**

1. Click the header "Categories" button
   - expect: a dialog opens with Wallpapers, Ringtones and Notification Sounds groups; the Ringtones group has links `/ringtones?categories=...` (28 observed) [verified-live]
2. In the Ringtones group click "Pop"
   - expect: URL is `/ringtones?categories=POP` [verified-live]
   - expect: cards are rendered (count > 0) and the chip row shows "Pop" and "Reset All" [verified-live]

#### 4.2. RT-07 [P2][New][@regression] "Explore different ringtone categories" opens a category page with sub-filters

**File:** `tests/ringtones/ringtones-category-nav.spec.ts`

**Steps:**

1. On /ringtones scroll to "Explore different ringtone categories" and click the "Blues" link
   - expect: the block heading is "Explore different ringtone categories" and has category links (209 observed) [verified-live]
   - expect: URL is `/category/ringtones/blues`, H1 "Blues Ringtones Free Download" and cards (count > 0) [verified-live]
2. Record the URL and H1, then click a sub-filter chip that is not a link back to the current page (`main h1 + div a`)
   - expect: URL and H1 change [verified-live: `/category/ringtones/blue`, "Blue Ringtones Free Download"], and the page lists valid cards
   - Do not assert that the card hrefs change: Blue can return the same 24 cards as Blues (2 of 3 live runs, ZED-10)
   - Do not assert the heading of the Explore block on the category page itself (see bug candidate 1).

### 5. Filtering

**Seed:** `tests/seed.spec.ts`

#### 5.1. RT-08 [P1][New][@smoke] Each filter applied alone updates results and URL

**File:** `tests/ringtones/ringtones-filters.spec.ts`

Data-driven, one test per row, each starting from unfiltered /ringtones:

| Filter   | Option                                  | URL contains                          | Extra invariant                           |
| -------- | --------------------------------------- | ------------------------------------- | ----------------------------------------- |
| Category | Animals                                 | `categories=ANIMALS`                  | chip "Animals" shown                      |
| Tag      | first option in the dialog (contextual) | `tags=<that tag>`                     | none (titles need not contain the tag)    |
| Price    | Free                                    | `free=true`                           | no card has a price badge                 |
| Price    | Paid                                    | `paid=true`                           | every card has a crown and a digits price |
| Duration | From 10, To 15                          | `minDuration=10` and `maxDuration=15` | every card duration is within 10..15 s    |
| Sort by  | Most popular                            | `sort=POPULAR`                        | first card hrefs differ from the baseline |

**Steps:**

1. Record baseline card hrefs, apply the filter option (close the dropdown with `closeFilter()`)
   - expect: URL contains the param from the table [verified-live: Free, Paid, Duration, Most popular through the UI; Category and Tag through the UI together with other options, Category alone through a deep link]
   - expect: card hrefs differ from the baseline, count > 0 [assumed: verified for Category, Free, Paid, Most popular, Duration; not as a separate check for Tag alone]
   - expect: the extra invariant holds [verified-live except "chip Animals shown" via the UI with a single option: [assumed]]
   - The Tag option is read from the dialog at run time: the list is contextual.

#### 5.2. RT-09 [P1][New][@smoke] Reset All clears every active filter

**File:** `tests/ringtones/ringtones-filters.spec.ts`

**Steps:**

1. On unfiltered /ringtones
   - expect: "Reset All" is not present [verified-live]
2. Apply Category=Animals and Category=Games, then a Tag
   - expect: "Reset All" is visible [verified-live]
3. Click "Reset All"
   - expect: URL has no filter params (`categories`, `tags`, `free`, `paid`, `minPrice`, `maxPrice`, `minDuration`, `maxDuration`, `sort`) [verified-live: URL became `/ringtones`]
   - expect: "Reset All" disappears [verified-live]
   - expect: card hrefs change [assumed]
   - Do not start from a keyword search: Reset All keeps `keyword` (fact 8).

#### 5.3. RT-10 [P2][New][@regression] Multiple options in Category and Tag

**File:** `tests/ringtones/ringtones-filters.spec.ts`

**Steps:**

1. Select Category Animals, then Games
   - expect: both options have `aria-checked="true"` [verified-live]
   - expect: URL has `categories=ANIMALS%2CGAMES`, chips "Animals" and "Games" [verified-live]
   - expect: card hrefs differ from the unfiltered set [verified-live]
2. Select two Tag options
   - expect: both options have `aria-selected="true"` and both tags are in the URL (`tags=a%2Cb`) [verified-live]
3. Uncheck one option
   - expect: only the other stays selected and in the URL [assumed]

#### 5.4. RT-11 [P2][New][@regression] Pairwise filter combinations

**File:** `tests/ringtones/ringtones-filters.spec.ts`

Data-driven, one test per pair, each from unfiltered /ringtones:

| Pair                                    | Invariant after both filters                                        |
| --------------------------------------- | ------------------------------------------------------------------- |
| Category=Pop + Price=Free               | both in URL; no card has a price badge                              |
| Price=Paid + Sort by=Price: High to Low | both in URL; every card has a price; first 10 prices non-increasing |
| Price=Free + Duration 10..15            | both in URL; no price badge; every duration within 10..15 s         |

**Steps:**

1. Apply the first filter, record hrefs, apply the second
   - expect: both params are in the URL [verified-live through deep links `categories=POP&free=true`, `paid=true&sort=PRICE_DESC`, `free=true&minDuration=10&maxDuration=15`; applying them through the UI: [assumed]]
   - expect: the invariant from the table holds [verified-live through the same deep links]
   - expect: hrefs change after each filter [assumed]

#### 5.5. RT-12 [P2][New][@regression] Price range From / To limits card prices

**File:** `tests/ringtones/ringtones-filters.spec.ts`

**Steps:**

1. Open the Price filter, set From = 50 (commit with Tab, wait for `minPrice=50`), then To = 500 (wait for `maxPrice=500`)
   - expect: URL has `minPrice=50` and `maxPrice=500` [verified-live]
   - expect: every rendered card has a crown and a price between 50 and 500 inclusive [verified-live: 24 cards, 50..500]
   - Each value is committed on its own: after From alone the URL is `minPrice=50&maxPrice=NaN` (bug candidate 2).
   - A range below 11 is useless here: every paid card in the default order costs 10.

#### 5.6. RT-13 [P3][New][@regression] Filters are restored from a deep link

**File:** `tests/ringtones/ringtones-filters.spec.ts`

**Steps:**

1. Navigate to `/ringtones?categories=POP&sort=PRICE_DESC&minPrice=11&minDuration=5`
   - expect: Category shows "Pop" checked, Sort by shows "Price: High to Low" checked [verified-live]
   - expect: chips "Pop", "From: 11 Ƶ", "From: 5 Sec", "Price: High to Low" are shown [verified-live]
   - expect: every card price is at least 11, first 10 prices non-increasing, every duration at least 5 s [verified-live]
   - expect: the Price dialog shows From = 11 and the Duration dialog From = 5 [assumed]

### 6. Ringtone Detail Page

**Seed:** `tests/seed.spec.ts`

#### 6.1. RT-14 [P2][New][@regression] Free ringtone detail page

**File:** `tests/ringtones/ringtone-detail.spec.ts`

**Steps:**

1. Apply Price=Free and open the first card without a crown (a free card can still carry a crown, fact 3)
   - expect: URL equals the card's href, H1 equals the card's title [verified-live]
   - expect: artist link `a[href^="/profiles/"]`, a "<N> Downloads" text and at least one tag chip are shown [verified-live]
   - expect: no "Premium" text and no "Buy for" button; one visible "Download" button [verified-live]
   - expect: a player (`button[title="Play audio"]`) is present [verified-live]

#### 6.2. RT-15 [P3][New][@regression] Tag chip on the detail page opens a keyword search

**File:** `tests/ringtones/ringtone-detail.spec.ts`

**Steps:**

1. Open any card, click its first tag chip
   - expect: URL is `/ringtones?keyword=<tag>`, cards are rendered, the search input contains the tag [verified-live: 10 cards for `DHH`, so do not expect 24]

#### 6.3. RT-16 [P3][New][@regression] Related section renders valid cards

**File:** `tests/ringtones/ringtone-detail.spec.ts`

**Steps:**

1. Open any card, scroll gradually to "Related"
   - expect: heading "Related" appears only after scrolling, then cards are shown [verified-live: 24 cards]
   - expect: card invariants from RT-01 hold and none of the related hrefs equals the open ringtone [verified-live]

#### 6.4. RT-17 [P2][New][@regression] Audio preview starts and stops from the list card and the detail player

**File:** `tests/ringtones/ringtone-detail.spec.ts`

The only observable play state is `data-playing` on `[class*="card-audio-progress"]` (fact 11); there is no `<audio>` element
and the button name never changes. Audible output and the end of playback are not asserted.

**Steps:**

1. On /ringtones?free=true click the play button of the first card
   - expect: `data-playing` goes `false` -> `true`, the URL does not change (the click is not swallowed by the card link) [verified-live]
   - expect: the progress width grows while playing [verified-live: 8% after 2.5 s]
   - expect: a second click returns `data-playing` to `false` [verified-live]
2. Open the card and repeat on the detail player
   - expect: same `false` -> `true` -> `false` sequence [verified-live]
3. Start card 2 while card 1 plays
   - expect: card 1 stops, card 2 plays [assumed: seen by the exploring agent, not re-checked]

### 7. Download and Purchase (Guest)

**Seed:** `tests/seed.spec.ts`

#### 7.1. RT-18 [P1][New][@smoke][@download] Free ringtone downloads after the countdown

**File:** `tests/ringtones/ringtones-download.spec.ts`

**Steps:**

1. Apply Price=Free, open the first card without a crown, start waiting for the `download` event (timeout at least 40 s), click "Download"
   - expect: dialog "Preparing your download" with a countdown number and "Please wait a few moments for the download to begin" [verified-live; countdown was 15, do not assert the number]
   - expect: no "Unlock and Support the Artist" modal [verified-live]
2. Wait for the download
   - expect: `suggestedFilename` ends with `.mp3`, the saved file is not empty (481207 bytes observed, `ID3` header) [verified-live]
   - expect: the dialog closes by itself [assumed]
   - Save into a per-test folder; the wallpapers `DownloadFlow` is typed to the wallpapers list and `.jpg`.

#### 7.2. RT-19 [P1][New][@smoke] Premium ringtone above 10 credits shows its price and the purchase gate

**File:** `tests/ringtones/ringtones-purchase.spec.ts`

Data-driven:

| Variant       | How to pick the card                                                        |
| ------------- | --------------------------------------------------------------------------- |
| Lowest price  | `minPrice=11`, Sort by=Price: Low to High, first (15 observed)              |
| Highest price | Price=Paid, Sort by=Price: High to Low, first (100000 observed in the list) |

Price 10 is excluded on purpose (see RT-20).

**Steps:**

1. Pick the card, record its price, open it
   - expect: "Premium" is shown and a button "Buy for Ƶ<price>" matches the card price, no "Download" button [verified-live for the lowest variant; highest variant: [assumed]]
2. Click "Buy for Ƶ<price>"
   - expect: dialog "To buy this item you need <price> Zedge Credits", a "Log in" link, Cancel and Buy Credits [verified-live at 15; highest variant: [assumed]]
   - Do not assert a credits-package selector (absent at 15, seen at 50 by the exploring agent) and do not click Buy Credits or Log in.
3. Close the dialog: Cancel for the first variant, Escape for the second
   - expect: dialog closes, URL unchanged, "Buy for Ƶ<price>" still shown [verified-live: both ways, at price 15]

#### 7.3. RT-20 [P2][New][bug candidate][@regression] Premium ringtone priced 10 offers the watch-ad unlock instead of Buy

**File:** `tests/ringtones/ringtones-purchase.spec.ts`

**[bug candidate].** Decided by the human on 2026-10-01: this is a bug, the same inconsistency as ZED-3 in wallpapers (a Premium
item shows "Download" instead of "Buy for Ƶ10"). Not filed yet: it waits for `gate: file bug`, then ticket, triage, repro, and
only then a `@BUG:<KEY>` test with `{ type: 'bug', description }` asserting the current behavior. Until then no test is written.
Every sampled price-10 ringtone behaves the same (unlike wallpapers, where the two price-10 items disagree).

**Steps:**

1. Open a premium ringtone priced 10 (`paid=true`, first card with price 10)
   - expect: "Premium" and a "Download" button are shown, no "Buy for" button [verified-live: 5 of 5 sampled]
2. Click "Download"
   - expect: dialog "Unlock and Support the Artist" with the artist name, "Login & Watch Ad" and "Buy Credits" [verified-live]
3. Close the dialog with its Close button
   - expect: dialog closes [verified-live]
   - expect: no download starts [assumed]

#### 7.4. RT-21 [P3][New][@regression] Opening a premium ringtone by direct URL keeps the gate

**File:** `tests/ringtones/ringtones-purchase.spec.ts`

**Steps:**

1. Take the href of the first card from `minPrice=11`, Sort by=Price: Low to High; open a new page and go to that href
   - expect: "Premium", the price and "Buy for Ƶ<price>" are shown [verified-live: the page was opened by href and showed "Buy for Ƶ15"]
   - expect: the same state as when opened from the list [assumed: not compared side by side]

## Bug candidates

Notes only, no tickets. Each needs `gate: file bug` before a ticket and a `@BUG:<KEY>` test.

1. **[bug candidate] Wrong heading on ringtone category pages.** `/category/ringtones/blues` and `/category/ringtones/rock`
   show the bottom H2 "Explore different wallpaper categories" over ringtone links; `/ringtones` says "Explore different
   ringtone categories". Seen on 2 of 2 pages checked.
2. **[bug candidate] `maxPrice=NaN` when only "From" is set.** From=50 gave `?minPrice=50&maxPrice=NaN` (same family as the
   wallpapers bug in the WP-35 notes). Duration does not do this (`minDuration=10` alone).
3. **[bug candidate, low] `DialogContent requires a DialogTitle` console error** when the Download dialogs open: logged for
   the free "Preparing your download" dialog and for the premium "Unlock and Support the Artist" modal, **not** for the "Buy
   for Ƶ15" modal (unlike wallpapers WP-33). Two blocked-ad console errors are logged on every page: filter for "DialogTitle".
4. **[bug candidate / CONFIRM] Free ringtones carry a crown.** Two "Silver Morning" items under `categories=POP&free=true`
   show a crown without a price and a "Premium" badge with a "Download" button on the detail page.
5. **[bug candidate] Price-10 premium ringtones show Download, not Buy** (RT-20). Confirmed as a bug by the human, same as
   ZED-3; to be filed later with `gate: file bug`.
6. **[CONFIRM] The header search chip reads "All" on `/ringtones`**, not "Ringtones".
7. **[low] The play button's accessible name stays "Play audio" while playing** (no `aria-pressed`); only `data-playing`
   changes, a test hook that may not stay.

Agent claims not re-verified and not used as an oracle: the Share button has no accessible name; "Reset All" does nothing when
only a keyword is active; "Newest first" gives the same first cards as the default order; playback resets the width on pause.

## Reuse map

| Scenario group              | Reuse from `pages/` and `src/`                                                                                                                                                               | New                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry, list (RT-01)         | `HeaderPage` (`validateHeader`, locators), `dismissCookieBanner`, `TIMEOUTS`                                                                                                                 | `pages/ringtones/RingtonesListPage` (`open(path)` keeps the wallpapers contract)                                                                                                   |
| Search (RT-02, RT-03)       | `HeaderPage.search(value, 'Ringtones')` (verified to expect `?keyword=`), `searchFilterBtn`                                                                                                  | `noResultsHeading` (`Couldn’t find anything`) in the list page                                                                                                                     |
| Scroll (RT-04, RT-05)       | pattern of `scrollDownGradually`, `getCardsHref`, `compareCardsHrefArrays`, `waitForCardsToUpdate`, `loadMoreBtn`                                                                            | see "Decision for the Story" below                                                                                                                                                 |
| Category nav (RT-06, RT-07) | `HeaderPage.selectCategory('Ringtones', 'Pop')` works for single-word categories only (it uppercases: `HIP HOP` and `NEWS & POLITICS` are wrong, the site uses `HIP_HOP`, `NEWS_N_POLITICS`) | `exploreCategoriesHeading` and `subFilterLinks` for ringtones                                                                                                                      |
| Filters (RT-08..RT-13)      | `FiltersBar` structure and dialog-by-name pattern, `SortByType` (already has the two price options), `PriceOptionType`, `closeFilter()` idea                                                 | `RingtonesFiltersBar` (Duration instead of Color, Tag is a `combobox`, duration `menuitem` names), a `DurationOptionType` if a type is wanted                                      |
| Detail (RT-14..RT-16)       | patterns of `WallpaperDetailPage`                                                                                                                                                            | `pages/ringtones/RingtoneDetailPage` (tags are `/ringtones?keyword=`, buttons rendered twice: use visible)                                                                         |
| Audio preview (RT-17)       | none                                                                                                                                                                                         | a small player component: `button[title="Play audio"]` + `[class*="card-audio-progress"]` `data-playing`                                                                           |
| Download (RT-18)            | `removeSpaces`, `clearDownloadFolder`                                                                                                                                                        | `RingtoneDownloadFlow` (dialog "Preparing your download", `download` event, `.mp3`); `DownloadFlow` is wallpapers-typed and `.jpg`                                                 |
| Purchase (RT-19..RT-21)     | `ModalBuyPage` (`purchaseTitle`, `loginLink`, `cancelBtn`, `buyCreditsBtn`, `headerCloseBtn`)                                                                                                | `validatePurchaseModalDialog` asserts a package button that is absent at price 15; its `modal` locator (`Modal_modal` `.nth(1)`) was not tested on ringtones, role `dialog` worked |
| Wiring                      | `src/utils/tags.ts` already has `@ringtones`                                                                                                                                                 | `AppPageObjects`: `ringtonesListPage`, `ringtoneDetailsPage`; `tests/ringtones/`                                                                                                   |

**Decision for the Story.** The list-page helpers (`getCardsHref`, `scrollDownGradually`, `validateAutoLoadImagesOnScrollDown`,
`expectCardPricesNonIncreasing`, `waitForCardsToUpdate`, the `cardsAll`/`cardsPremium` locators) are written against
`WallpapersListPage` and the `/wallpapers/<GUID>` regex. Copying them is a `[dup-pom]` finding; extracting a shared base list
class, or parameterising the card href prefix, is the alternative. The same applies to `gotoWallpapersWithRetry` (private,
keyed to `wallpaperTitle`). `RingtoneCategoryType` has `Hollydays` (typo; the exploring agent saw "Holidays", not re-checked) and
`SearchOptionType` has `Notification sounds` against the site's `Notification Sounds`; neither blocks this plan.

## Go / no-go

**Go**, with the cuts below.

- **Does a guest see free items?** Yes. The default list had 11 free of the first 24, and `?free=true` returned 24 cards
  without a price badge [verified-live].
- **Does a free item really download?** Yes: a real `.mp3` (481207 bytes, `ID3`) after a countdown of up to ~15 s, no ad or
  login [verified-live]. RT-18 needs a test timeout of at least 40 s.
- **Does a preview play headless?** Partly. The UI state flips and the progress bar advances, but there is no `<audio>`
  element, so sound, end of playback and the "one at a time" rule cannot be asserted (RT-17 asserts state only). If it flakes
  in CI, demote it to P3 rather than add waits.

Cuts and holds: RT-20 is a `[bug candidate]` waiting for `gate: file bug`; no audible-output or end-of-playback checks; no
narrow-viewport scenario; Notification Sounds, Artists search, profile pages and share are out of scope for this area.
Recommendation: write the Story for RT-01..RT-19 and RT-21 (20 scenarios), with RT-20 attached to the bug. The pilot dry run
starts with list + search only (RT-01..RT-03).
