<!-- suite -->

# premium purchase gate behavior across different price points, and opening a premium wallpaper via direct URL

### Prerequisite

- URL: https://www.zedge.net/wallpapers

<!-- test
priority: critical
-->

# Verify premium purchase gate behavior for a low-tier price point wallpaper accessed directly

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Navigate directly to a low-tier premium wallpaper URL
- Click the download button on the premium wallpaper detail page
- Select the low price unlock option on the purchase gate modal

## Expected

- The premium purchase gate overlay is displayed
- The unlock option shows the correct low price point criteria
- A prompt to execute the low-tier transaction is displayed

<!-- test
priority: critical
-->

# Verify premium purchase gate behavior for a high-tier price point wallpaper accessed directly

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Navigate directly to a high-tier premium wallpaper URL
- Click the download button on the premium wallpaper detail page
- Select the high price unlock option on the purchase gate modal

## Expected

- The premium purchase gate overlay is displayed
- The unlock option shows the correct high price point criteria
- A prompt to execute the high-tier transaction is displayed

<!-- test
priority: high
-->

# Filter list by Price and verify premium purchase gate on selected item

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click the Price Filter button in the filter bar
- Select the Premium filter option from the dropdown
- Click on the first premium wallpaper item in the filtered list
- Click the unlock button on the detail view

## Expected

- The wallpapers list updates to show premium items
- The selected premium wallpaper detail page opens
- The premium purchase gate overlay is displayed when trying to unlock
