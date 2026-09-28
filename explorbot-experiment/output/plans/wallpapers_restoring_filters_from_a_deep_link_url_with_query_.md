<!-- suite -->

# restoring filters from a deep link URL with query parameters, and the price range From/To slider

### Prerequisite

- URL: https://www.zedge.net/wallpapers

<!-- test
priority: critical
-->

# Restore price range filter from a deep link URL

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the wallpapers page using a deep link URL with price range query parameters
- Click the Price Filter button to open the filter panel

## Expected

- The From and To price sliders reflect the restored filter values from the URL
- The wallpapers list is updated to show only items matching the restored price range

<!-- test
priority: important
-->

# Adjust price range using the From and To slider and verify URL updates

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click the Price Filter button
- Adjust the From price slider to a higher value
- Adjust the To price slider to a lower value
- Apply the price filter

## Expected

- The wallpapers list updates based on the selected price range
- The browser URL changes to include the new price range query parameters

<!-- test
priority: high
-->

# Restore multiple filters including tag and price range from deep link query parameters

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Open the wallpapers page using a deep link URL containing both tag and price range parameters
- Click the Price Filter button to inspect the price range slider

## Expected

- The tag filter is restored with the correct active tag selection
- The From and To price range sliders are restored to the correct positions
- The wallpapers list displays items matching both the active tag and price range
