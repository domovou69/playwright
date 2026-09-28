<!-- suite -->

# infinite scroll auto-loading more cards and the Load more button behavior

### Prerequisite

- URL: https://www.zedge.net/wallpapers

<!-- test
priority: critical
-->

# Verify that scrolling to the bottom of the wallpaper list triggers infinite scroll auto-loading of more cards

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the Wallpapers page
- Scroll down to the bottom of the initial wallpaper card list

## Expected

- More wallpaper cards are automatically loaded and appended to the grid
- The scrollbar height updates to reflect the newly loaded content

<!-- test
priority: important
-->

# Verify that clicking the Load more button loads the next set of wallpaper cards

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the Wallpapers page
- Scroll down to locate the Load more button at the end of the initial feed
- Click the Load more button

## Expected

- A new batch of wallpaper cards is successfully appended to the grid
- The total number of visible wallpaper cards increases

<!-- test
priority: high
-->

# Verify infinite scroll auto-loading of more cards on a category-filtered wallpaper list

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the Wallpapers page
- Click the Animals Category link to filter the feed
- Scroll to the bottom of the filtered Animals wallpaper list

## Expected

- Additional Animals wallpaper cards auto-load and append to the grid
- All newly loaded wallpaper cards are relevant to the selected category
