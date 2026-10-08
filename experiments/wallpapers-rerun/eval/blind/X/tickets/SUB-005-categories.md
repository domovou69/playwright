# SUB-005: Categories
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/05-categories.spec.ts`

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | Category page | H1, title, self canonical, ≥20 valid cards |
| 2 | Infinite scroll | More than 24 cards after scroll |
| 3 | Related chips | Navigate to another category with cards |
| 4 | Header Categories menu | "Animals" → `/wallpapers?categories=ANIMALS` with cards |
| 5 | Link health | First/middle/last footer category links return 200 (3 requests) |
| 6 | Unknown category | HTTP 404 page with heading and links |
| 7 | Trailing slash | Normalised to canonical URL |
