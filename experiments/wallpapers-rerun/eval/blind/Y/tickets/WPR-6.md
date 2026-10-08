# TKT-6 Wallpapers: Price filter with only From puts maxPrice=NaN in the URL

Type: Bug | Status: To Do | Labels: repro-confirmed


## Summary
On /wallpapers, entering only "From" in the Price filter puts `maxPrice=NaN` in the URL.

## Steps (guest, production, no login)
1. Open https://www.zedge.net/wallpapers
2. Click Price, type 11 in "From", press Enter
3. Read the URL

## Expected
No `maxPrice` param (or a valid number) in the URL.

## Actual
`https://www.zedge.net/wallpapers?minPrice=11&maxPrice=NaN`. The list still filters (prices from 11), but the URL carries the invalid value, so a shared or reloaded link has a broken param.

## Notes
Found while implementing TKT-3 (WP-12, "Price: Low to High" start). Plan bug candidate 2; same behavior as ringtones and notification sounds. Covered later by WP-14 (price range).

## Comment 2026-10-08T11:12:40.982Z

Repro outcome: reproduced

Steps:
1. Open /wallpapers
2. Price > From = 11 > Enter
3. URL becomes /wallpapers?minPrice=11&maxPrice=NaN

Reproduced headless on production as guest, twice (also in the TKT-3 probe). Run with a headless Playwright script, not the MCP: the MCP browser_run_code tool refused without a seeded test setup. No related ticket in triage.

Evidence: tickets/evidence/TKT-6/nan.png
