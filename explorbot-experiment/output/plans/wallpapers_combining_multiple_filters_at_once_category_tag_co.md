<!-- suite -->

# combining multiple filters at once (category, tag, color, price, sort) and resetting all filters via Reset All

### Prerequisite

- URL: https://www.zedge.net/wallpapers

<!-- test
priority: critical
-->

# Combine category, tag, and color filters on the wallpapers feed and reset them all

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click Category Filter and select a category option
- Click Tag Filter and select an active tag
- Click Color Filter and select a color option
- Click Reset All button to clear all selected filters

## Expected

- The wallpapers list updates to match the selected category, tag, and color
- All active filter tags or badges are removed from the filter bar after clicking Reset All
- The wallpaper grid restores to the default homepage feed of wallpapers

<!-- test
priority: important
-->

# Combine price and sort by filters on the wallpapers feed and reset them all

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click Price Filter and select a price option
- Click Sort by Filter and select a sorting option
- Click Reset All button to clear the active filters

## Expected

- The wallpapers feed sorts and filters the displayed items according to the price and sort choices
- The price and sort selections return to their default states after clicking Reset All
- The default wallpapers list is displayed once again

<!-- test
priority: high
-->

# Combine all available filters including category, tag, price, color, and sort at once and reset them

## Requirements

https://www.zedge.net/wallpapers

## Steps

- Click Category Filter and select a category
- Click Tag Filter and select a tag option
- Click Price Filter and select a price tier
- Click Color Filter and select a color block
- Click Sort by Filter and choose a sorting mechanism
- Click Reset All button to clear the highly specific search

## Expected

- The wallpapers feed displays only items matching all five active criteria
- All active filter indicators are cleared upon clicking Reset All
- The complete unfiltered feed of free wallpapers is restored
