# BUG-002: "Newest first" is not ordered by publish date

**Severity:** Medium (the sort does not do what its label says) · **Area:** Wallpapers feed sorting · **Found by:** `03-sorting.spec.ts` (marked `test.fail`)

## Steps
1. Open https://www.zedge.net/wallpapers as a guest, choose **Sort by → Newest first** (`?sort=NEWEST`).
2. Open the first eight cards and note the date shown on each detail page.

## Actual (observed 2026-10-08)
Detail-page dates in feed order: Oct 8, **Jul 20**, Oct 8, Oct 8, **Jul 20**, **Sep 3**, Oct 8, Oct 8.
Older premium wallpapers are interleaved among items published today.
A second observation with `?sort=NEWEST&free=true` (free only): dates Oct 7 → Oct 8 → … (an Oct 8 item ranked after an Oct 7 one), so the problem is not limited to premium items. The effect varies from run to run with the live content.

## Expected
Cards ordered by publish date, newest first. The sort key looks like something other than the publish date shown on the detail page (e.g. last-updated or a relevance boost). If promotion is intended it should be labelled; otherwise the sort key is wrong.

## Notes
Content is live, so the exact dates will change; the invariant is that dates never increase down the list.
