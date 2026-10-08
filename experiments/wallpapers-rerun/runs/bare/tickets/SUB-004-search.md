# SUB-004: Search and keywords
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/04-search.spec.ts`

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | Header search | "cat" → `/find/cat`, Wallpapers "View all" and valid wallpaper results |
| 2 | View all | → `/wallpapers?keyword=cat`, heading mentions cat, ≥20 cards |
| 3 | Keyword + filter | Keyword kept when Free is applied; no premium cards |
| 4 | No results | Gibberish → "couldn't find it" page with suggestions, no wallpaper cards |
| 5 | Suggestion | Clicking a suggested keyword opens a keyword feed with cards |
| 6 | Odd input | Spaces, `&`, quotes, Cyrillic → no 5xx, page renders |
| 6b | Percent sign | "100%" does not throw URIError loops — **fails today, BUG-003** |
| 7 | Empty submit | No error page |
| 8 | Keyword chip on detail | Opens `/wallpapers?keyword=…` |
