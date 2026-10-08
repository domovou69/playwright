# SUB-007: Free download (guest)
Parent: [STORY-001](STORY-001-wallpapers-guest-e2e.md) · Spec: `tests/wallpapers/07-download.spec.ts`

| # | Scenario | Invariant |
|---|----------|-----------|
| 1 | Download | Click triggers a file download with image extension, >20 KB, correct magic bytes; no login, no gate; page unchanged |
| 2 | File name | Derived from the wallpaper title |
| 3 | Countdown | Guest sees a "Preparing your download" dialog (~15 s) that closes once the file arrives |
| 4 | Repeat | A second download works on the same page |
