# Bugs found in the wallpapers comparison

Every bug each case claimed or encoded as a test. "Judge check" means the blinded judge reproduced it headlessly on production on
2026-10-08 (guest, no login, no purchase). The last column is left for the owner: relevance means whether the defect is worth
fixing or reporting to the site, not whether it is real.

| #   | Defect                                                                                        | Found by                                   | Filed as                  | Author severity     | Judge check                                              | Relevance (owner) |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------- | ------------------- | -------------------------------------------------------- | ----------------- |
| 1   | Premium items at the same price (10) show different primary buttons: "Download" vs "Buy"      | original (known, ZED-3)                    | Jira ZED-3 + test `WP-29` | see Jira           | Reproduced (two items named in the ticket)               |                   |
| 2   | Buy modal logs a Radix console warning: missing `Description` / `aria-describedby`           | original (known, ZED-4)                    | Jira ZED-4 + test `WP-33` | see Jira           | Reproduced                                               |                   |
| 3   | `/wallpapers?sort=<unknown>` returns HTTP 500 "Oops, Something went wrong!"                  | bare                                       | `BUG-001` + `test.fail`   | Low                 | Reproduced (status 500)                                  |                   |
| 4   | "Newest first" is not ordered by the publish date shown on the detail page                    | bare                                       | `BUG-002` + `test.fail`   | Medium              | Reproduced (Oct 8, Oct 8, Oct 6, Oct 8, ... Oct 4, ...) |                   |
| 5   | `%` in a search term (`/find/100%25`) makes the client throw `URIError` in an endless loop    | bare                                       | `BUG-003` + `test.fail`   | High for that query | Reproduced (844 errors in 5 s)                           |                   |
| 6   | Price filter with only "From" gives `?minPrice=11&maxPrice=NaN` in the URL                    | harness                                    | `WPR-6`, no test          | not set             | Reproduced                                               |                   |

Known bugs not found: bare 0 of 2 (ZED-3, ZED-4); harness 0 of 2. The harness plan names ZED-3 and a DialogTitle console message
as candidates but filed neither. False positives: none in any case.

## Details

### 1. Price 10: Download vs Buy (ZED-3, original)

"White Feathers Floating Dark Wallpaper" (`/wallpapers/a1b0f0ad-1ccd-4410-95f7-f04b3823c604`) shows "Download" (ad-unlock flow);
"Spooky Mansion" (`/wallpapers/e1b7e619-872b-4180-bd79-2f426d91c225`) shows "Buy for Ƶ10". Expected: a Premium item shows Buy.
Both new runs saw the symptom while writing the purchase gate and worked around it (the harness excluded price 10, the bare run
skipped such items). The same pattern was later filed for notification sounds as ZED-18.

### 2. Missing dialog description (ZED-4, original)

Opening "Buy for Ƶ10" logs ``Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}``. An
accessibility defect with no visible effect.

### 3. Unknown `sort` value gives HTTP 500 (bare, BUG-001)

1. Open `https://www.zedge.net/wallpapers?sort=BOGUS` as a guest.
2. Actual: HTTP 500, "Oops, Something went wrong!", no wallpapers. Expected: fall back to the default order (an unknown
   `colors=zzz` is ignored) or at worst a 4xx. `?sort=PRICE_LOW_TO_HIGH` fails the same way; valid keys are NEWEST, POPULAR,
   PRICE_ASC, PRICE_DESC. Reach: needs a hand-edited or outdated link.

### 4. "Newest first" is not in date order (bare, BUG-002)

1. Open `/wallpapers?sort=NEWEST`, open the first eight cards, note each detail-page date.
2. Actual (bare run): Oct 8, Jul 20, Oct 8, Oct 8, Jul 20, Sep 3, Oct 8, Oct 8. Judge, ten cards: Oct 8, Oct 8, Oct 6, Oct 8,
   Oct 8, Oct 8, Oct 6, Oct 8, Oct 4, Oct 8. With `free=true` an Oct 8 item ranks after an Oct 7 one, so it is not only premium.
   Expected: dates never increase down the list. The sort key may be something other than the displayed publish date (a boost
   or last-updated); if it is promotion it should be labelled. The test self-skips when the live data happens to be ordered.

### 5. `%` in search freezes the page (bare, BUG-003)

1. Type `100%` in the header search and press Enter, or open `https://www.zedge.net/find/100%25`.
2. Actual: 404 "Oops, couldn't find it" page and the client script throws `URIError: URI malformed` at `decodeURI` in a loop
   (about 610 errors in 5 s for the bare run, 844 for the judge); an automated browser could not finish closing the page.
   Expected: a normal "nothing found" page. Percent signs appear in real queries ("100% cotton").

### 6. `maxPrice=NaN` (harness, WPR-6)

1. Open `/wallpapers`, Price, type 11 in "From", press Enter.
2. Actual: `/wallpapers?minPrice=11&maxPrice=NaN`. The list still filters, but the URL carries an invalid parameter, so a shared or
   reloaded link has a broken value. The same behavior exists in ringtones and notification sounds. Evidence:
   `runs/harness/tickets/evidence/WPR-6/nan.png`. No `@BUG` test was written.

## Observed but not filed (not verified by the judge)

The harness plan lists these as bug candidates and did not file them because the Story allows a bug test only after an approved
ticket: `minPrice` ignored with `paid=true`; malformed query values return HTTP 500 (close to bug 3); Reset All keeps the
keyword; DialogTitle console error (close to bug 2); missing accessible names; absurd prices; the header scope chip reads
"All"; a premium item priced 10 shows Download (bug 1). The bare run also notes that early clicks before hydration are ignored,
which it does not treat as a defect.
