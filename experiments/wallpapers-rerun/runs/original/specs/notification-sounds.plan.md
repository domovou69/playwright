# Notification Sounds Section Test Plan

Status: approved 2026-10-06

## Application Overview

Scope: the Notification Sounds section of zedge.net - list page (`/notification-sounds`), header search with the
"Notification Sounds" filter, category navigation (header "Categories" menu), list filters (Category / Tag / Price /
Duration / Sort by / Reset All), infinite scroll and "Load more", the audio preview control, the notification sound detail
page, free download, and the premium purchase gate.

Constraints:

- Guest user only, free content only. Every purchase or sign-in flow stops once the dialog is verified.
- Desktop viewport only (Desktop Chrome project).
- Live production site, headless browsers only.
- No security testing (XSS, SQL injection, fuzzing) and no load or performance testing.
- Content is live: assert invariants (URL params, badges, prices, counts > 0, href changes), never a specific title or
  exact count. Items are identified by their `href` (`/notification-sounds/<GUID>`).
- Out of scope: Wallpapers and Ringtones, Artists search, `/profiles/<GUID>` pages, share, "Download app" tiles, narrow
  viewport, the `/category/notification-sounds/<slug>` pages (see "Not applicable or cut").

## Revision log

- v1 (2026-10-06): scouted for the v3 Story entry run (Stage 10 of `agentic-qa-loop-v2.plan.md`). Base: `ringtones.plan.md`.
  Every fact below was re-checked live through the Playwright MCP (headless, guest, production) on 2026-10-06. I did not use
  the `playwright-test-planner` agent for a first draft: the RT plan already gave the structure, so I probed the site directly.
  Each expected result carries `[verified-live]` (seen in this session, with what I did) or `[assumed]` (not seen).

## Premise check: the player

The brief said Notification Sounds has no large player in the centre of the detail page. **That is not what the site shows.**
A notification sound detail page has the same 120x120 round play button over a 360x360 cover image in the centre of the left
panel as a ringtone detail page (screenshots of both compared side by side, `[verified-live]`). The play control, the
`[class*="card-audio-progress"]` / `data-playing` markup and the list card player are the same. So the audio-preview scenario
**applies** (NS-16) and nothing is cut for a missing player. Please confirm this reading at the gate; if the brief meant
something else (for example, no audio at all), say so and I will revise.

## Verified facts (used as the test oracle)

All `[verified-live]` on 2026-10-06 unless noted.

1. **List page.** `/notification-sounds`, H1 "Download Notification Sounds And Soundboard Effects For Free". Filter bar: a label
   chip `Notification Sounds`, then `Category`, `Tag` (a `combobox`), `Price`, `Duration`, `Sort by`. A second "Notification
   Sounds" chip and a "Filters" button exist in the DOM but are not visible on desktop. No `<h2>` on the list page, no
   "Explore different ... categories" block (unlike `/ringtones`), no footer link to Notification Sounds.
2. **Cards.** 24 on first load, `a[href^="/notification-sounds/<GUID>"]`, same card markup as ringtones: `title`, a
   `button[title="Play audio"]`, a duration `p[data-size="sm"]` (`1 s`..`6 s` in the first 24, much shorter than ringtones),
   price badge in `div[class*="card-footer"]` with a crown in `div[class*="card-header"]`. **`aria-label` is
   `Ringtone: <title>`, not `Notification sound: <title>`** (bug candidate 4).
3. **Price badge.** First 24: 12 with a digits-only badge `10` and a crown, 12 with neither. Free filter: 24 cards, 0 badges, 0
   crowns (no "crown without price" case seen, unlike ringtones fact 3). Paid filter: 24 of 24 have a crown and a price.
4. **Search.** The header chip reads **"All"** on a fresh `/notification-sounds`; options All, Wallpapers, Ringtones,
   Notification Sounds, Artists (`menuitemradio`). With the "Notification Sounds" scope: URL
   `/notification-sounds?keyword=ping`, H1 gets the keyword as a prefix ("Ping Download Notification Sounds And Soundboard
   Effects For Free"), 24 cards, input keeps the term, 23 of 24 titles contain "ping". `love song` gives
   `?keyword=love%20song` and 24 cards. No match: H2 `Couldn’t find anything`, 0 cards, chip stays "Notification Sounds".
5. **Categories menu.** `dialog` "Categories" with three groups; the Notification Sounds group has 28 links
   `a[href="/notification-sounds?categories=<ENUM>"]`. The list differs from ringtones: it adds `MESSAGE_TONES`,
   `SOUND_EFFECTS`, `CONTACT_RINGTONES`, `COMEDY`, `RELIGIOUS`; enums `HIP_HOP`, `NEWS_N_POLITICS`, `RNB_SOUL`. Clicking Pop gives
   `/notification-sounds?categories=POP`, 24 cards, chips "Pop" and "Reset All".
6. **Filters and URL params.**

   | Control  | Options                                                                       | Mode   | URL param                                                  |
   | -------- | ----------------------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
   | Category | 28 options (`role=option`)                                                    | multi  | `categories=MESSAGE_TONES%2CSOUND_EFFECTS`                 |
   | Tag      | contextual list (10 on the unfiltered list; `role=option`)                    | multi  | `tags=<a>%2C<b>` [assumed: options read, none clicked]     |
   | Price    | Free, Paid (options); From, To (`menuitem`)                                   | -      | `free=true`, `paid=true`, `minPrice=`, `maxPrice=`         |
   | Duration | From, To (`menuitem`, "Minimum/Maximum duration in seconds"); **no slider**   | -      | `minDuration=`, `maxDuration=`                             |
   | Sort by  | Relevance, Newest first, Price: Low to High, Price: High to Low, Most popular | single | `sort=PRICE_DESC`, `sort=POPULAR` (Relevance has no param) |

   Dialogs open by name (`getByRole('dialog', { name })` worked for Category, Price, Duration, Sort by). Applied filters show
   as chips plus `Reset All` (seen after Category, Duration and the deep link). Duration chips read "From: 2 Sec" / "To: 3 Sec".
   The Duration dialog has no slider (`getByRole('slider')` count 0); ringtones had one.

7. **Duration range.** From 2 (committed with Tab) gives `?minDuration=2`, then To 3 gives `?minDuration=2&maxDuration=3`; all 24
   cards were 2..3 s. Durations are 1-8 s, so use small bounds (ringtones used 10..15, which would return nothing).
8. **Price.** Default paid list: every price is **10**. Sorted High to Low: `100000, 50000, 10000, 10000, ...`. Lowest price above
   10: `?minPrice=11&sort=PRICE_ASC` gives first price **20** (ringtones: 15). From=50 then To=500 through the UI gives 24 cards,
   all with a crown and a price in 50..300. From alone gives `?minPrice=50&maxPrice=NaN` (bug candidate 2).
   **`?paid=true&minPrice=11&sort=PRICE_ASC` still returned price 10 cards**: minPrice was ignored when `paid=true` is set
   (bug candidate 5). Pairwise scenarios must not combine Paid with a price range.
9. **Scroll.** 24 cards, one gradual scroll round (8 x 200 px, 300 ms) -> 72, "Load more" visible; click -> 96; no duplicate hrefs.
10. **Audio preview.** No `<audio>` element. State is `data-playing="true|false"` on `[class*="card-audio-progress"]` inside the
    card, with a growing `style.width` (39% after 1.2 s: sounds are 1-6 s long, so the bar fills quickly and playback may
    **end by itself** within the check window). The click does not navigate. Same markup on the detail player (fact 11).
11. **Detail page.** `/notification-sounds/<GUID>`, H1 = title, artist link `a[href^="/profiles/"]`, "< 10 Downloads" text,
    keyword chips `a[href^="/notification-sounds?keyword=<tag>"]` (7-10 per page), the central 120x120 play button, "Related"
    heading (24 cards, present without scrolling in this session, unlike ringtones), no Share button name (`Share` role count
    0). The page has 25 `button[title="Play audio"]` (the player plus 24 related cards): scope the player locator.
12. **Free download.** "Download" opens a `dialog` "Preparing your download" with a countdown (15) and "Please wait a few
    moments for the download to begin"; the download fired about 16.6 s after the click: `phoenix.mp3`, 33061 bytes, `ID3` header.
    No "Unlock and Support the Artist" modal. The dialog was gone 1.5 s after the download.
13. **Premium gate depends on price.** Price **10**: detail page shows "Premium" and a visible "Download" (no Buy); Download opens
    "Unlock and Support the Artist" with "Login & Watch Ad", "Login to unlock 3 free premium downloads daily!", "Buy Credits"
    and a close control; closing leaves no dialog. Price **20** (lowest above 10): `Buy for Ƶ20`, no Download; the modal says
    "To buy this item you need 20 Zedge Credits", "Already have an account? Log in" (a `Log in` link), Cancel, Buy Credits;
    Cancel closes it and the URL is unchanged. 1 sample each, not 5 like the RT plan.
14. **Category pages exist but are orphaned.** `/category/notification-sounds/blues` is 200 with H1 "Blues Notification Sounds, &
    Soundboard Effects Free Download", 24 cards, 10 noisy sub-chips (`Carrusel`, `Abc`, ...) and a bottom H2 "Explore
    different **wallpaper** categories" over 219 `/category/notification-sounds/...` links. `/category/notification-sounds`
    is a 404. Nothing on the list page, the header menu or the footer links to them.
15. **Console noise.** Every page logs blocked ad scripts (`htlbid.js`, `htlbid.css`). `DialogContent requires a DialogTitle`
    was logged 16 times over the session (download and gate dialogs). One `500` from `/api/graphql` appeared once in the
    session and was not tied to a step.

## Not applicable or cut

Mirrored from `ringtones.plan.md` as the same behaviour: RT-01..RT-06, RT-08..RT-16, RT-18..RT-21 (see the map below). Not mirrored:

| RT scenario                                         | Why it does not apply                                                                                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RT-07 "Explore different ringtone categories" block | No such block on `/notification-sounds` and no link into the category pages (fact 14). Cut. The category pages are a bug-candidate note, not a scenario. |
| RT-17 audio preview                                 | **Does apply** (premise check): kept as NS-16, with a short-sound caveat.                                                                                |
| "Player" scenarios that assume a big centre player  | None needed: the player exists. The list-card and detail-player checks are both kept.                                                                    |
| RT-13 slider assertions                             | The Duration dialog has no slider; NS-12 asserts the From input and chip only.                                                                           |
| RT-11 Free + Duration 10..15 s                      | Durations are 1-8 s. Replaced by 2..3 s.                                                                                                                 |
| RT-11 Category=Pop + Free                           | Pop has few items (Pop + `minPrice=11` + sort gave **1 card**), so use Category=Message tones + Free instead and never assert 24 cards.                  |

## Conventions

- Tags: `@notification-sounds` and `@guest` on the `describe`; `@smoke` marks P1, `@regression` the rest; `@download` for real
  downloads; `@BUG:<JIRA-KEY>` for known bugs (none filed yet - see "Bug candidates").
- Bug tests assert the **current** behavior, carry `@BUG:<KEY>` and `{ type: 'bug', description }`, and are written only
  after the bug has a ticket.
- Seed: `tests/seed.spec.ts` (wallpapers only today; the Story decides whether a NS seed is needed).

## Coverage Summary

| Status                     | Count  |
| -------------------------- | ------ |
| New                        | 20     |
| Bug documentation (`@BUG`) | 0      |
| **Total scenarios**        | **20** |

| Priority | Count |
| -------- | ----- |
| P1       | 7     |
| P2       | 9     |
| P3       | 4     |

## Test Scenarios

### 1. List Page

**Seed:** `tests/seed.spec.ts`

#### 1.1. NS-01 [P2][New][@regression] List page loads with header, filter bar and valid cards

**File:** `tests/notification-sounds/notification-sounds-list.spec.ts`

**Steps:**

1. Open /notification-sounds
   - expect: H1 is visible and contains "Notification Sounds", URL is /notification-sounds [verified-live]
2. Check the header: logo, Categories, search chip + input + Search button, credits button, Sign in
   - expect: all visible and enabled with the existing `HeaderPage` locators; the cancel control is absent while the input is empty [assumed: the header is shared and was seen on this page, but I did not run `validateHeader`]
3. Check the filter bar: label chip "Notification Sounds", Category, Tag, Price, Duration, Sort by
   - expect: all six visible; "Reset All" is not present [verified-live]
4. Check the first 24 cards
   - expect: every href matches `^/notification-sounds/[a-f0-9-]{36}$` [verified-live]
   - expect: every title is non-empty and the `aria-label` contains the title [verified-live]. Do not assert the `Ringtone:` prefix (bug candidate 4).
   - expect: every card has a play button and a duration matching `^\d+ s$` [verified-live]
   - expect: every card with a price badge has a crown and a digits-only price; a card without a footer has no badge [verified-live]
   - Do not assert that both free and premium cards exist.

### 2. Search

**Seed:** `tests/seed.spec.ts`

#### 2.1. NS-02 [P1][New][@smoke] Search by single and multi-word keywords (Notification Sounds scope)

**File:** `tests/notification-sounds/notification-sounds-search.spec.ts`

Data-driven: `ping` and `love song`. The scope is selected through `HeaderPage.search(value, 'Notification Sounds')`
(the existing `SearchOptionType` spells it `Notification sounds`, so the option is matched case-sensitively; fix the type, not the test).

**Steps:**

1. On /notification-sounds search for the term with the "Notification Sounds" filter
   - expect: URL contains `/notification-sounds?keyword=<encoded term>` [verified-live: `ping`, `love%20song`]
   - expect: cards are rendered (count > 0), the input keeps the term, the chip reads "Notification Sounds" [verified-live for `ping`: 24 cards, input `ping`; chip read after the no-match search; `love song`: cards only]
   - expect: at least one title contains the term (single word) or one of its words (multi-word) [verified-live for `ping`: 23 of 24; `love song` titles: [assumed]]

#### 2.2. NS-03 [P2][New][@regression] Search with no matches shows the empty state

**File:** `tests/notification-sounds/notification-sounds-search.spec.ts`

**Steps:**

1. Search (Notification Sounds filter) for `zzzxxxqqqnonexistent123456`
   - expect: URL contains the encoded term [verified-live]
   - expect: heading "Couldn’t find anything" (`/couldn.?t find anything/i`) is shown [verified-live]
   - expect: no cards are rendered [verified-live]; no suggested keywords [assumed: not inspected on this page]

### 3. Infinite Scroll and Load More

**Seed:** `tests/seed.spec.ts`

#### 3.1. NS-04 [P1][New][@smoke] Auto-load on scroll preserves previous results

**File:** `tests/notification-sounds/notification-sounds-scroll.spec.ts`

**Steps:**

1. Open /notification-sounds; record the card hrefs
   - expect: "Load more" is not present, 24 cards [verified-live]
2. Scroll down gradually until "Load more" is visible (at most 6 rounds)
   - expect: the card count increases (24 -> 72 in the observed run) [verified-live]
   - expect: previous hrefs preserved in order, no duplicates [verified-live: no duplicates; order: [assumed], not compared]
   - expect: "Load more" becomes visible and enabled [verified-live: visible; enabled: [assumed]]

#### 3.2. NS-05 [P2][New][@regression] "Load more" loads more cards and re-enables auto-loading

**File:** `tests/notification-sounds/notification-sounds-scroll.spec.ts`

**Steps:**

1. Scroll until "Load more" is visible; record hrefs; click it
   - expect: card count increases (72 -> 96 observed) [verified-live]
   - expect: previous hrefs preserved in order, no duplicates [assumed: count seen, order not compared after the click]
2. Scroll to the last card 3 times
   - expect: each scroll appends cards, previous hrefs preserved, no duplicates [assumed: not run on this area]
   - Stop here; do not test for an end of results.

### 4. Category Navigation

**Seed:** `tests/seed.spec.ts`

#### 4.1. NS-06 [P1][New][@smoke] Header "Categories" menu opens a category in the list page

**File:** `tests/notification-sounds/notification-sounds-category-nav.spec.ts`

**Steps:**

1. Click the header "Categories" button
   - expect: a dialog "Categories" opens with 28 links `/notification-sounds?categories=...` in the Notification Sounds group [verified-live]
2. Click "Pop" in that group
   - expect: URL is `/notification-sounds?categories=POP` [verified-live]
   - expect: cards are rendered (count > 0) and the chip row shows "Pop" and "Reset All" [verified-live: 24 cards]
   - `HeaderPage.selectCategory` is typed for wallpaper and ringtone categories and uppercases the label (`Hip Hop` -> wrong enum); use Pop only.
   - The group headings are not links in the dialog; assert the three group names by text, as `HeaderPage.validateHeader` already does.

### 5. Filtering

**Seed:** `tests/seed.spec.ts`

#### 5.1. NS-07 [P1][New][@smoke] Each filter applied alone updates results and URL

**File:** `tests/notification-sounds/notification-sounds-filters.spec.ts`

Data-driven, one test per row, each starting from unfiltered /notification-sounds:

| Filter   | Option                                  | URL contains                        | Extra invariant                           |
| -------- | --------------------------------------- | ----------------------------------- | ----------------------------------------- |
| Category | Message tones                           | `categories=MESSAGE_TONES`          | chip "Message tones" shown                |
| Tag      | first option in the dialog (contextual) | `tags=<that tag>`                   | none (titles need not contain the tag)    |
| Price    | Free                                    | `free=true`                         | no card has a price badge                 |
| Price    | Paid                                    | `paid=true`                         | every card has a crown and a digits price |
| Duration | From 2, To 3                            | `minDuration=2` and `maxDuration=3` | every card duration is within 2..3 s      |
| Sort by  | Most popular                            | `sort=POPULAR`                      | first card hrefs differ from the baseline |

**Steps:**

1. Record baseline card hrefs, apply the filter option (close the dropdown with `closeFilter()`)
   - expect: URL contains the param from the table [verified-live through the UI: Category, Free, Paid, Duration, Most popular; Tag: [assumed], options listed but none clicked]
   - expect: card hrefs differ from the baseline, count > 0 [verified-live: Category, Sort; Free/Paid/Duration: count only; Tag: [assumed]]
   - expect: the extra invariant holds [verified-live except Tag (none) and the "Message tones" chip, seen as one chip after the click]
   - The Tag option is read from the dialog at run time: the list is contextual.

#### 5.2. NS-08 [P1][New][@smoke] Reset All clears every active filter

**File:** `tests/notification-sounds/notification-sounds-filters.spec.ts`

**Steps:**

1. On unfiltered /notification-sounds
   - expect: "Reset All" is not present [verified-live]
2. Apply Category=Message tones and Category=Sound effects, then a Tag
   - expect: "Reset All" is visible [verified-live after Category]; the two-category URL is `categories=MESSAGE_TONES%2CSOUND_EFFECTS` [verified-live]; Tag step: [assumed]
3. Click "Reset All"
   - expect: URL has no filter params (`categories`, `tags`, `free`, `paid`, `minPrice`, `maxPrice`, `minDuration`, `maxDuration`, `sort`) [assumed: the button was never clicked in this session; ringtones behaves this way]
   - expect: "Reset All" disappears; card hrefs change [assumed]
   - Do not start from a keyword search: ringtones keeps `keyword` on Reset All (RT fact 8); not checked here.

#### 5.3. NS-09 [P2][New][@regression] Multiple options in Category and Tag

**File:** `tests/notification-sounds/notification-sounds-filters.spec.ts`

**Steps:**

1. Select Category Message tones, then Sound effects
   - expect: URL has `categories=MESSAGE_TONES%2CSOUND_EFFECTS` [verified-live]
   - expect: both options have `aria-checked="true"`, chips "Message tones" and "Sound effects" [assumed: `aria-checked` was `false` on unselected options; selected state and the second chip not read]
2. Select two Tag options
   - expect: both have `aria-selected="true"` and both tags are in the URL (`tags=a%2Cb`) [assumed]
3. Uncheck one option
   - expect: only the other stays selected and in the URL [assumed]

#### 5.4. NS-10 [P2][New][@regression] Pairwise filter combinations

**File:** `tests/notification-sounds/notification-sounds-filters.spec.ts`

Data-driven, one test per pair, each from unfiltered /notification-sounds:

| Pair                                    | Invariant after both filters                                        |
| --------------------------------------- | ------------------------------------------------------------------- |
| Category=Message tones + Price=Free     | both in URL; no card has a price badge                              |
| Price=Paid + Sort by=Price: High to Low | both in URL; every card has a price; first 10 prices non-increasing |
| Price=Free + Duration 2..3              | both in URL; no price badge; every duration within 2..3 s           |

**Steps:**

1. Apply the first filter, record hrefs, apply the second
   - expect: both params are in the URL [assumed: no pair was applied; single filters and `paid=true&sort=PRICE_DESC` through a deep link were checked]
   - expect: the invariant holds [verified-live only for `paid=true&sort=PRICE_DESC`: first prices `100000, 50000, 10000, ...`; the other two pairs: [assumed]]
   - expect: hrefs change after each filter [assumed]
   - Do not pair Paid with a price range (fact 8, bug candidate 5).

#### 5.5. NS-11 [P2][New][@regression] Price range From / To limits card prices

**File:** `tests/notification-sounds/notification-sounds-filters.spec.ts`

**Steps:**

1. Open the Price filter, set From = 50 (commit with Tab, wait for `minPrice=50`), then To = 500 (wait for `maxPrice=500`)
   - expect: URL has `minPrice=50` and `maxPrice=500` [verified-live]
   - expect: every rendered card has a crown and a price between 50 and 500 inclusive [verified-live: 24 cards, 50..300]
   - Each value is committed on its own: after From alone the URL is `minPrice=50&maxPrice=NaN` (bug candidate 2).
   - A range below 11 is useless: every paid card in the default order costs 10.

#### 5.6. NS-12 [P3][New][@regression] Filters are restored from a deep link

**File:** `tests/notification-sounds/notification-sounds-filters.spec.ts`

**Steps:**

1. Navigate to `/notification-sounds?categories=MESSAGE_TONES&sort=PRICE_DESC&minPrice=11&minDuration=1`
   - expect: chips "Message tones", "From: 11 Ƶ", "From: 1 Sec", "Price: High to Low" are shown [verified-live with `categories=POP` in place of `MESSAGE_TONES`: chips Pop, From: 11 Ƶ, From: 1 Sec, Price: High to Low, Reset All]
   - expect: every card price is at least 11, first 10 prices non-increasing, every duration at least 1 s [verified-live with the Pop link, but it returned **1 card** (price 20, 5 s), so the check was trivial; with Message tones: [assumed]]
   - expect: the Category dialog shows the option checked, Sort by shows "Price: High to Low" checked; the Price dialog shows From = 11 and the Duration dialog From = 1 [assumed]
   - Pick a category with many items; do not use Pop (1 card).

### 6. Notification Sound Detail Page

**Seed:** `tests/seed.spec.ts`

#### 6.1. NS-13 [P2][New][@regression] Free notification sound detail page

**File:** `tests/notification-sounds/notification-sound-detail.spec.ts`

**Steps:**

1. Apply Price=Free and open the first card
   - expect: URL equals the card's href, H1 equals the card's title [verified-live]
   - expect: artist link `a[href^="/profiles/"]`, a "<N> Downloads" text (`< 10 Downloads` observed) and at least one keyword chip are shown [verified-live]
   - expect: no "Premium" text and no "Buy for" button; one visible "Download" button [verified-live]
   - expect: the player play button is present [verified-live; scope it: 25 buttons on the page]

#### 6.2. NS-14 [P3][New][@regression] Tag chip on the detail page opens a keyword search

**File:** `tests/notification-sounds/notification-sound-detail.spec.ts`

**Steps:**

1. Open any card, click its first tag chip
   - expect: URL is `/notification-sounds?keyword=<tag>`, cards are rendered, the search input contains the tag [verified-live: `Fire`, 24 cards, input `Fire`]. Other tags may return fewer than 24.

#### 6.3. NS-15 [P3][New][@regression] Related section renders valid cards

**File:** `tests/notification-sounds/notification-sound-detail.spec.ts`

**Steps:**

1. Open any card, scroll gradually to "Related"
   - expect: heading "Related" and cards are shown [verified-live: 24 cards, present before and after scrolling]
   - expect: card invariants from NS-01 hold and none of the related hrefs equals the open item [verified-live for count only; invariants and the self-exclusion: [assumed]]

#### 6.4. NS-16 [P2][New][@regression] Audio preview starts and stops from the list card and the detail player

**File:** `tests/notification-sounds/notification-sound-detail.spec.ts`

The only observable play state is `data-playing` on `[class*="card-audio-progress"]` (fact 10). Sounds last 1-6 s, so the
preview may end by itself: assert `false -> true` right after the click and the stop through a second click quickly, never a
fixed delay, and prefer `expect.poll`. Audible output and the end of playback are not asserted.

**Steps:**

1. On /notification-sounds?free=true click the play button of the first card
   - expect: `data-playing` goes `false` -> `true`, the URL does not change [verified-live]
   - expect: the progress width grows while playing [verified-live: 39% after 1.2 s]
   - expect: a second click returns `data-playing` to `false` [verified-live]
2. Open the card and repeat on the detail player
   - expect: same `false` -> `true` -> `false` sequence [verified-live]
3. Start card 2 while card 1 plays
   - expect: card 1 stops, card 2 plays [assumed: not run here, only seen by an earlier agent on ringtones]

### 7. Download and Purchase (Guest)

**Seed:** `tests/seed.spec.ts`

#### 7.1. NS-17 [P1][New][@smoke][@download] Free notification sound downloads after the countdown

**File:** `tests/notification-sounds/notification-sounds-download.spec.ts`

**Steps:**

1. Apply Price=Free, open the first card, start waiting for the `download` event (timeout at least 40 s), click "Download"
   - expect: dialog "Preparing your download" with a countdown number and "Please wait a few moments for the download to begin" [verified-live; countdown was 15, do not assert the number]
   - expect: no "Unlock and Support the Artist" modal [verified-live]
2. Wait for the download
   - expect: `suggestedFilename` ends with `.mp3`, the saved file is not empty (33061 bytes observed, `ID3` header) [verified-live]
   - expect: the dialog closes by itself [verified-live: gone 1.5 s after the download]
   - Save into a per-test folder; wallpapers `DownloadFlow` is typed to wallpapers and `.jpg`.

#### 7.2. NS-18 [P1][New][@smoke] Premium notification sound above 10 credits shows its price and the purchase gate

**File:** `tests/notification-sounds/notification-sounds-purchase.spec.ts`

Data-driven:

| Variant       | How to pick the card                                                        |
| ------------- | --------------------------------------------------------------------------- |
| Lowest price  | `minPrice=11` (no `paid=true`), Sort by=Price: Low to High, first (20 seen) |
| Highest price | Price=Paid, Sort by=Price: High to Low, first (100000 seen in the list)     |

Price 10 is excluded on purpose (see NS-19).

**Steps:**

1. Pick the card, record its price, open it
   - expect: "Premium" and a button "Buy for Ƶ<price>" matching the card price, no "Download" button [verified-live for the lowest variant; highest: [assumed]]
2. Click "Buy for Ƶ<price>"
   - expect: dialog "To buy this item you need <price> Zedge Credits", a "Log in" link, Cancel and Buy Credits [verified-live at 20; highest: [assumed]]
   - Do not assert a credits-package selector and do not click Buy Credits or Log in.
3. Close the dialog: Cancel for the first variant, Escape for the second
   - expect: dialog closes, URL unchanged, "Buy for Ƶ<price>" still shown [verified-live: Cancel at price 20, URL unchanged; Escape and the "still shown" check: [assumed]]

#### 7.3. NS-19 [P2][New][bug candidate][@regression] Premium notification sound priced 10 offers the watch-ad unlock instead of Buy

**File:** `tests/notification-sounds/notification-sounds-purchase.spec.ts`

**[bug candidate].** Same inconsistency as RT-20 and ZED-3 (a Premium item shows "Download" instead of "Buy for Ƶ10"). Per the
human's 2026-10-01 decision on ringtones it is treated as a bug, but **not filed for this area**: it waits for `gate: file bug`,
then ticket, triage, repro, and only then a `@BUG:<KEY>` test with `{ type: 'bug', description }` asserting the current behavior.
Until then no test is written.

**Steps:**

1. Open a premium item priced 10 (`paid=true`, first card with price 10)
   - expect: "Premium" and a visible "Download" button, no "Buy for" button [verified-live: 1 sample, "🧊 Reply"]
2. Click "Download"
   - expect: dialog "Unlock and Support the Artist" with "Login & Watch Ad" and "Buy Credits" [verified-live]
3. Close the dialog
   - expect: dialog closes [verified-live: via Escape fallback; the Close button name was not read]
   - expect: no download starts [assumed]

#### 7.4. NS-20 [P3][New][@regression] Opening a premium notification sound by direct URL keeps the gate

**File:** `tests/notification-sounds/notification-sounds-purchase.spec.ts`

**Steps:**

1. Take the href of the first card from `minPrice=11`, Sort by=Price: Low to High; open a new page and go to that href
   - expect: "Premium", the price and "Buy for Ƶ<price>" are shown [verified-live: the same item was opened by its href, "Buy for Ƶ20"; this session opened it by clicking the card the first time and by href the second, both showed it]
   - expect: the same state as when opened from the list [assumed: not compared side by side]

## Bug candidates

Notes only, no tickets. Each needs `gate: file bug` before a ticket and a `@BUG:<KEY>` test.

1. **[bug candidate] Wrong heading on category pages.** `/category/notification-sounds/blues` shows the bottom H2 "Explore
   different wallpaper categories" over notification sound links. Same family as ringtones bug candidate 1. 1 page checked.
2. **[bug candidate] `maxPrice=NaN` when only "From" is set.** From=50 gave `?minPrice=50&maxPrice=NaN`. Same as ringtones
   bug candidate 2 and the wallpapers WP-35 notes.
3. **[bug candidate, low] `DialogContent requires a DialogTitle`** console errors when the download, gate and buy dialogs open
   (16 in the session, mixed across dialogs; I did not attribute them per dialog). Filter for "DialogTitle".
4. **[bug candidate] Card `aria-label` says "Ringtone: <title>"** on every notification sound card (24 of 24). Copy-paste from
   the ringtones card, wrong for screen-reader users.
5. **[bug candidate / CONFIRM] `minPrice` is ignored when `paid=true`.** `?paid=true&minPrice=11&sort=PRICE_ASC` returned 24
   cards priced 10. Without `paid=true` the same params returned prices from 20. Not checked on ringtones or wallpapers.
6. **[bug candidate] Price-10 premium items show Download, not Buy** (NS-19), same as RT-20 / ZED-3.
7. **[CONFIRM] The header search chip reads "All" on `/notification-sounds`**, not "Notification Sounds" (as on ringtones).
8. **[low] Orphaned category pages.** `/category/notification-sounds/<slug>` is 200 with 24 cards but nothing links to it from
   the section, and the sub-chips are noise (`Carrusel`, `Abc`, `Suono Dell%27acqua Del Rubinetto` with an unescaped `%27`).
   `/category/notification-sounds` is a 404.
9. **[low] The play button's accessible name stays "Play audio" while playing**, as on ringtones.

Not verified and not used as an oracle: a single `500` from `/api/graphql` appeared once in the console during the session.

## Reuse map

The ringtones area already has the page objects this area needs. Per CLAUDE.md, copying them is a `[dup-pom]` finding:
extract one shared class parameterised by the difference and re-run the ringtones smoke tests.

| Scenario group           | Reuse from `pages/`, `pages/ringtones/` and `src/`                                                                     | New / parameterised                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry, list (NS-01)      | `HeaderPage`, `dismissCookieBanner`, `TIMEOUTS`, `RingtonesListPage` as the pattern                                    | `pages/notification-sounds/NotificationSoundsListPage` with `open(path)`; share the base with `RingtonesListPage` rather than copy it                |
| Cards (NS-01, NS-04..05) | `RingtoneCards` (settled count, `validateFirst`), `CardLinkValidator`, `CardListScroller` (scroll, Load more)          | parameterise the href prefix (`/notification-sounds/`); `aria-label` differs (fact 2); the duration regex is the same                                |
| Search (NS-02, NS-03)    | `HeaderPage.search(value, filter)`                                                                                     | fix `SearchOptionType` (`Notification sounds` -> `Notification Sounds`); `noResultsHeading` exists on the ringtones list                             |
| Category nav (NS-06)     | `HeaderPage` categories dialog, `selectCategory` for single-word entries                                               | `CategoriesMainType` already has the group; `selectCategory` is typed for wallpaper and ringtone names: widen it                                     |
| Filters (NS-07..NS-12)   | `RingtonesFiltersBar` (Duration From/To `menuitem`s, Tag `combobox`), `SortByType`, `PriceOptionType`, `closeFilter()` | parameterise the filters bar by area (a different category list, no slider); category option names need an area-specific type                        |
| Detail (NS-13..NS-15)    | `RingtoneDetailPage` pattern: artist, downloads, keyword chips, visible buttons                                        | `pages/notification-sounds/NotificationSoundDetailPage` or a shared base with the keyword-chip href prefix as the difference                         |
| Audio preview (NS-16)    | `AudioPlayer` (`data-playing`, progress width)                                                                         | scope the detail player (`first()` is the central player, the other 24 are related cards); short-sound handling in the assertion                     |
| Download (NS-17)         | `RingtoneDownloadFlow` (dialog, `download` event, `.mp3`)                                                              | likely no new class: confirm it is not typed to the ringtones list                                                                                   |
| Purchase (NS-18..NS-20)  | `ModalBuyPage`, the ringtones purchase test shape                                                                      | none; same dialog texts, price numbers differ                                                                                                        |
| Wiring                   | `src/utils/tags.ts` already has `@notification-sounds`; CLAUDE.md `## Areas` row exists                                | `AppPageObjects`: `notificationSoundsListPage` (and a detail page); `tests/notification-sounds/` with the ESLint `no-restricted-syntax` rule applied |

## Go / no-go

**Go**, with the cuts above. Almost everything mirrors ringtones; the new work is mostly parameterising shared classes.

- **Does a guest see free items?** Yes. 12 of the first 24 had no price badge; `?free=true` returned 24 cards without badges or
  crowns [verified-live].
- **Does a free item really download?** Yes: a real `.mp3` (`phoenix.mp3`, 33061 bytes, `ID3`) about 16.6 s after the click,
  after a "Preparing your download" countdown of 15, no ad or login [verified-live]. NS-17 needs a test timeout of at least 40 s.
- **Does a preview play headless?** Partly, as on ringtones: the UI state flips and the progress bar advances, there is no
  `<audio>`, so sound and end of playback cannot be asserted. Because the clips are 1-6 s the state can flip back to `false` by
  itself, which makes NS-16 more fragile than RT-17; if it flakes in CI, demote it to P3 rather than add waits.

Cuts and holds: the Explore block scenario (RT-07) is cut; NS-19 is a `[bug candidate]` waiting for `gate: file bug`; no
audible-output or end-of-playback checks; no narrow-viewport scenario; wallpapers, ringtones, Artists search, profile pages and
share are out of scope. Recommendation: write the Story for NS-01..NS-18 and NS-20 (19 scenarios), with NS-19 attached to a bug.
The first group should be list + search only (NS-01..NS-03), as on ringtones.
