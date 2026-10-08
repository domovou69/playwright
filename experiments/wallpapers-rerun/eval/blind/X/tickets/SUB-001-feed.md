# SUB-001: Feed and infinite scroll
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/01-feed.spec.ts`

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | First page | Title/H1 mention wallpapers; filter bar (Wallpapers, Category, Tag, Price, Color, Sort by) visible; ≥20 cards, every link is `/wallpapers/<uuid>` |
| 2 | Uniqueness and thumbnails | No duplicate card links; thumbnails (CSS background images) are answered 200 `image/*` by the image server |
| 3 | Infinite scroll | Scrolling to the end adds cards; still no duplicates |
| 4 | Open card / Back | Click opens its detail URL; browser Back returns to the feed with cards |
| 5 | Category block | Feed footer lists >10 category links and the "categories" heading |
| 6 | SEO basics | Canonical points at `/wallpapers`; meta description present |
| 7 | Phone viewport | 390px wide: cards render, no horizontal scroll |
