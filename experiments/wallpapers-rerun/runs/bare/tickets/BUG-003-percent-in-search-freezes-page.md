# BUG-003: Searching for a term containing "%" crashes the page script in an endless error loop

**Severity:** High for the affected query (page unusable, tab becomes unresponsive); Low overall reach · **Area:** Search (`/find/<term>`) · **Found by:** `04-search.spec.ts` (marked `test.fail`)

## Steps
1. Open https://www.zedge.net/wallpapers as a guest.
2. Type `100%` in the header search box and press Enter (or open https://www.zedge.net/find/100%25 directly).

## Actual
- URL becomes `/find/100%25`, server answers 404 with the "Oops, couldn't find it" page.
- In the browser the client script repeatedly throws `URIError: URI malformed` at `decodeURI` (chunk `9774-….js`). About 610 console errors were logged in 5 s; the page stays busy and an automated browser could not finish loading/closing it (tool calls hung until killed).

## Expected
A normal "nothing found" page (or results) for the term `100%`. Percent signs are common in real queries ("100% cotton", "50% off"). Malformed escape sequences must be handled (try/catch around `decodeURI`) rather than looping.

## Notes
Other odd input (`c&t "x"`, spaces, Cyrillic) is handled fine. Reproduced twice, via header search and via direct URL.
