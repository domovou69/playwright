<!-- suite -->

# wallpaper detail page extras: tag chips linking to search, and the related wallpapers section

### Prerequisite

- URL: https://www.zedge.net/wallpapers

<!-- test
priority: important
-->

# Verify that clicking a tag chip on the wallpaper detail page redirects to search results for that tag.

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the Wallpapers list page.
- Click on the first wallpaper card in the list to open its detail page.
- Locate the tag chips section on the wallpaper detail page.
- Click on one of the visible tag chips.

## Expected

- The wallpaper detail page opens successfully.
- The application navigates to the search results page for the clicked tag.
- The search results display wallpapers associated with that tag.

<!-- test
priority: important
-->

# Verify navigation to another wallpaper from the related wallpapers section on the wallpaper detail page.

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the Wallpapers list page.
- Click on the first wallpaper card in the list to open its detail page.
- Scroll down to the related wallpapers section.
- Click on a wallpaper card inside the related wallpapers section.

## Expected

- The initial wallpaper detail page loads with related content.
- Clicking the related wallpaper loads a new wallpaper detail page.
- The details and title update to match the selected related wallpaper.

<!-- test
priority: high
-->

# Verify that different tag chips on the wallpaper detail page link to distinct search results.

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the Wallpapers list page.
- Click on the first wallpaper card in the list to open its detail page.
- Locate the tag chips section on the wallpaper detail page.
- Click on a different tag chip than the first one.

## Expected

- The wallpaper detail page opens successfully.
- The search results page for the newly selected tag is displayed.
- The results are updated to reflect the new search context.
