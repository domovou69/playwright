<!-- suite -->

# search functionality including no-match empty state and clearing the search

### Prerequisite

- URL: https://www.zedge.net/wallpapers

<!-- test
priority: critical
-->

# Search for wallpapers with matching results

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click on the Search Input textbox
- Enter Cat into the Search Input textbox
- Click Search Submit button

## Expected

- The page updates to display search results
- The displayed wallpapers match the search term

<!-- test
priority: high
-->

# Search for wallpapers with no matching results to verify empty state

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click on the Search Input textbox
- Enter xyzqpwurty12345 into the Search Input textbox
- Click Search Submit button

## Expected

- No wallpapers are displayed in the results grid
- A message indicating no results were found is displayed

<!-- test
priority: important
-->

# Clear the search input to return to the default wallpapers list

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click on the Search Input textbox
- Enter Anime into the Search Input textbox
- Click Search Submit button
- Clear the text in the Search Input textbox
- Click Search Submit button with the empty search field

## Expected

- The search query is removed from the input field
- The default collection of wallpapers is displayed again
