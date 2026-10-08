# SUB-006: Detail page
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/06-detail.spec.ts`

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | Content | Title, author link to `/profiles/…`, date, downloads label, decoded preview image |
| 2 | Free state | No Premium label, Download enabled |
| 3 | Metadata | `<title>` contains the heading and ZEDGE; og:image https; og:title; canonical = URL |
| 4 | Structured data | JSON-LD parses and contains the wallpaper name |
| 5 | Related | ≥6 other valid wallpapers; opening one navigates |
| 6 | Keywords | Chip opens keyword feed |
| 7 | Guest state | Header shows Sign in |
| 8 | Unknown ids | Zero uuid → 404 page; malformed id → no 5xx |
