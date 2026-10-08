# SUB-003: Sorting
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/03-sorting.spec.ts`

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | Options | Relevance, Newest first, Price: Low to High, Price: High to Low, Most popular |
| 2 | Each option | URL carries `sort=NEWEST/POPULAR/PRICE_ASC/PRICE_DESC`, active chip, ≥20 valid cards |
| 3 | Price descending | Prices of loaded cards (free = 0) non-increasing, including after scroll |
| 4 | Price ascending | Prices non-decreasing |
| 5 | Newest first | Publish dates of the first 10 detail pages non-increasing — **fails today, BUG-002**; the test skips itself when the live data happens to be ordered |
| 6 | Sort + filter | Sort stays in URL when Free is added; no premium cards |
| 7 | Shared sorted URL | `?sort=POPULAR` loads and shows the chip |
| 8 | Unknown sort value | Falls back, no 5xx — **fails today, BUG-001** |

Not asserted: "Most popular" and "Relevance" order (no observable key on the page).
