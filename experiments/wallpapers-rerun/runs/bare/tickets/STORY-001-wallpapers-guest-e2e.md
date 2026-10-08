# STORY-001: Guest end-to-end coverage of the Wallpapers section

**Status:** Implemented  
**Target:** https://www.zedge.net/wallpapers (production, live content)  
**Persona:** anonymous guest, free content only

## Goal
A guest can browse, filter, sort, search, open and download free wallpapers, and is stopped
politely at the gate on premium ones. The suite proves this black-box with live-data-safe invariants.

## Out of scope
Login, purchase, credits, upload, ringtones/notification sounds/artists, load and security
probing, native-app deep links (`zedge.sng.link`), ads (blocked in the test fixture).

## Approach
- Playwright, Chromium headless, page objects in `src/pages/`, specs in `tests/wallpapers/`.
- Assert invariants (non-empty, unique, ordered, filtered, valid shapes), never exact titles or counts.
- Test data is discovered at run time from the feed (e.g. "first free card", "cheapest premium").
- Known defects are encoded as `test.fail(true, 'BUG-xxx')` so the suite stays green and flips red when fixed.

## Subtasks
| Id | Group | Spec |
|----|-------|------|
| [SUB-001](SUB-001-feed.md) | Feed and infinite scroll | `01-feed.spec.ts` |
| [SUB-002](SUB-002-filters.md) | Filters | `02-filters.spec.ts` |
| [SUB-003](SUB-003-sorting.md) | Sorting | `03-sorting.spec.ts` |
| [SUB-004](SUB-004-search.md) | Search and keywords | `04-search.spec.ts` |
| [SUB-005](SUB-005-categories.md) | Categories | `05-categories.spec.ts` |
| [SUB-006](SUB-006-detail.md) | Detail page | `06-detail.spec.ts` |
| [SUB-007](SUB-007-download.md) | Free download | `07-download.spec.ts` |
| [SUB-008](SUB-008-premium-gate.md) | Premium and guest gate | `08-premium-gate.spec.ts` |

## Bugs found
See `BUG-*.md` in this folder.

## Acceptance criteria
- All subtasks implemented, suite stable over repeated headless runs.
- Every defect found is filed as a BUG ticket.
- `RUN-SUMMARY.md` documents coverage, skips, bugs and how to run.
