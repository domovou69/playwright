# How to Run Tests

## Prerequisites

Before running the tests, ensure that you have the following installed:

- [Node.js](https://nodejs.org/en/)
- Add .env with BASE_URL=https://www.domain.net/

## Installation

To get started, install the project dependencies by running:

```bash
npm install
```

### Explanation of the Scripts:

- **`npm test`**: Runs all tests in headless mode.
- **`npm run test:ui`**: Runs the tests with the Playwright UI to observe them running.
- **`npm run test:download`**: Runs tests related to download tag.

# Suite: 'Wallpapers: Search, Filtering, and Free Downloading - Guest User'

## Context 1: Wallpapers: Search, Filtering

### Case 1.1: Search wallpapers by keywords

TC-01: Single and multiple words search (e.g. “sun” "mountains river") --- relevant results are displayed.
TC-02: Auto load images on scroll down. --- previous wallpapers load should be preserved, relevant results should be added

### Case 1.2: Filtering wallpapers by category, color, tags, price and sort by

TC-03: Apply filter by category ("nature") --- validate free and premium images
TC-04: Filtering by color ("pink") --- validate free and premium images
TC-05: Filter by tags ("black") --- validate free and premium images
TC-06: Filter by price (free vs premium) --- only relevant images are displayed.
TC-07: Filter by sort by --- only relevant images are displayed.
TC-08: Apply multiple filters at once > reset filters --- all filters removed

## Context 2: Wallpapers: Downloading and Purchase

### Case 2.1: Downloading images

TC-10: allows users to download free wallpapers after ad
TC-11: prevents downloading premium wallpapers without purchase
TC-12: allows guest users to purchase and download premium wallpapers using Z coins
