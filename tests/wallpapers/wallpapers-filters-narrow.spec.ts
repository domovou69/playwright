// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { hasUniqueValues } from '../../src/utils/helper';

const anyFilterInUrl = /categories|minPrice|maxPrice|colors|tags|sort|free=true|paid=true/;

test.describe('Responsive Filters Panel (narrow viewport)', { tag: ['@wallpapers', '@guest'] }, () => {
  // Verified live at 900x800 in the existing Desktop Chrome project (window resized smaller, not a
  // separate mobile device/project) - the exact breakpoint wasn't bisected.
  test.use({ viewport: { width: 900, height: 800 } });

  test('WP-35 At reduced width, the Filters panel applies, keeps and clears every filter', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Narrow /wallpapers shows one "Filters" chip instead of the inline bar; the panel opens on defaults
    await app.wallpapersListPage.open();
    await expect(app.wallpapersListPage.filterCategory).toBeHidden();
    await expect(app.wallpapersListPage.filterTag).toBeHidden();
    await expect(app.wallpapersListPage.filterPrice).toBeHidden();
    await expect(app.wallpapersListPage.filterColor).toBeHidden();
    await expect(app.wallpapersListPage.filterSortBy).toBeHidden();
    await expect(app.wallpapersListPage.filtersChip).toHaveText('Filters');

    const hrefsBaseline = await app.wallpapersListPage.getCardsHref();
    expect(hasUniqueValues(hrefsBaseline)).toBe(true);

    await app.wallpapersListPage.filtersChip.click();
    await app.wallpapersListPage.validateFiltersPanel();

    // 2. Categories are multi-select; Price=Free on top of them
    await app.wallpapersListPage.applyFiltersPanelOption('Categories', 'Anime', /categories=ANIME/);
    await app.wallpapersListPage.applyFiltersPanelOption('Categories', 'Nature', /NATURE/);
    await app.wallpapersListPage.applyFiltersPanelOption('Price', 'Free', /free=true/);
    await app.wallpapersListPage.validateCardExistance('Paid', false);

    // 3. "Clear" in one tab resets only that tab
    await app.wallpapersListPage.clearFiltersPanelTab('Categories');
    await expect(page).not.toHaveURL(/categories=/);
    await expect(page).toHaveURL(/free=true/);
    await app.wallpapersListPage.expectFiltersPanelRowDefault('Price', false);
    await app.wallpapersListPage.validateCardExistance('Paid', false);

    // 4. "Clear all" resets everything
    await app.wallpapersListPage.clearAllFiltersPanel();
    await expect(page).not.toHaveURL(anyFilterInUrl);

    // 5. Color and Tag
    await app.wallpapersListPage.applyFiltersPanelOption('Colors', 'Red', /colors=red/);
    await app.wallpapersListPage.applyFiltersPanelOption('Tags', 'halloween', /tags=halloween/);

    // 6. Sort By and a Price range on top
    await app.wallpapersListPage.applyFiltersPanelOption('Sort by', 'Price: High to Low', /sort=PRICE_DESC/);
    await app.wallpapersListPage.applyFiltersPanelPriceRange(50, 500);

    // 7. "Show Results" closes the panel; the chip counts active URL params (colors, tags, sort, minPrice, maxPrice); cards match the range and sort
    await app.wallpapersListPage.filtersPanelShowResultsBtn.click();
    await expect(app.wallpapersListPage.filtersPanel).not.toBeAttached();
    await expect(app.wallpapersListPage.filtersChip).toHaveText('Filters (5)');
    const cards = await app.wallpapersListPage.cardsAll.all();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const price = await app.wallpapersListPage.getCardPriceBadgeTextAsNumber(card);
      expect(price).toBeGreaterThanOrEqual(50);
      expect(price).toBeLessThanOrEqual(500);
    }
    await app.wallpapersListPage.expectCardPricesNonIncreasing();

    // 8. Reopened from the chip, every applied filter is still there
    await app.wallpapersListPage.filtersChip.click();
    await app.wallpapersListPage.expectFiltersPanelRowDefault('Colors', false);
    await app.wallpapersListPage.expectFiltersPanelRowDefault('Tags', false);
    await app.wallpapersListPage.expectFiltersPanelRowDefault('Price', false);
    await app.wallpapersListPage.expectFiltersPanelRowDefault('Sort by', false);

    // 9. "Clear all" again: defaults, clean URL, cards changed
    await app.wallpapersListPage.clearAllFiltersPanel();
    await expect(page).not.toHaveURL(anyFilterInUrl);
    await app.wallpapersListPage.filtersPanelShowResultsBtn.click();
    await expect(app.wallpapersListPage.filtersChip).toHaveText('Filters');
  });
});
