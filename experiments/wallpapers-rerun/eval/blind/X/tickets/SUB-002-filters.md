# SUB-002: Filters
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/02-filters.spec.ts`

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | Category options | ≥10 unique options incl. Nature, Animals |
| 2 | Price and Color options | Price = Free + Paid; Color has ≥5 incl. Black, Blue |
| 3 | Free | `free=true`, zero premium cards, also after loading more |
| 4 | Paid | `paid=true`, every card has a price, zero free cards |
| 5 | Color | `colors=blue`, chip shown, "Filters (1)", cards still present |
| 6 | Multi category | `categories=NATURE,ANIMALS`, result set differs from Nature alone |
| 7 | Tag | First tag from the list sets `tags=<tag>`, results shown, chip shown |
| 8 | Combination + Reset All | Free + Black both in URL; Reset All returns to `/wallpapers` and full feed |
| 9 | Shared URL | `?free=true&colors=blue` applied on load |
| 10 | Back | Browser Back undoes the last filter |
| 11 | Chip removal | Removing a chip drops only that filter |
| 12 | Empty states | Unknown color value and unknown keyword show "Couldn't find anything"; chip removal recovers |
| 13 | Stale link + Reset All | Reset All also clears an unrecognised filter value |
