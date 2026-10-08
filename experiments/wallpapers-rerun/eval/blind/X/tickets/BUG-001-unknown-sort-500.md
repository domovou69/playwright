# BUG-001: `/wallpapers?sort=<unknown>` returns HTTP 500 "Oops, Something went wrong!"

**Severity:** Low (needs a hand-edited or outdated URL) · **Area:** Wallpapers feed · **Found by:** `03-sorting.spec.ts` (marked `test.fail`)

## Steps
1. Open https://www.zedge.net/wallpapers?sort=BOGUS as a guest.

## Actual
HTTP **500**, page shows "Oops, Something went wrong!" and no wallpapers.

## Expected
Unknown sort value falls back to the default order (as an unknown `colors=zzz` value is ignored), or at worst a 4xx. A server error on user-controlled input should not occur; old shared links with a retired sort key would hit this.

## Notes
`?sort=PRICE_LOW_TO_HIGH` (plausible-looking guess) fails the same way. Valid keys: NEWEST, POPULAR, PRICE_ASC, PRICE_DESC.
