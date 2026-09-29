// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { hasUniqueValues } from '../../src/utils/helper';

test.describe('Responsive Filters Panel (narrow viewport)', () => {
  // Verified live at 900x800 in the existing Desktop Chrome project (window resized smaller, not a
  // separate mobile device/project) - this is the one width the collapse to a "Filters" chip was
  // confirmed at; the exact breakpoint wasn't bisected.
  test.use({ viewport: { width: 900, height: 800 } });

  test(
    'WP-35 At reduced width, the Filters panel shows filter controls and Price=Free updates results the same way the inline bar does',
    { tag: ['@wallpapers', '@guest', '@regression'] },
    async ({ app, page }) => {
      // 1. Set the viewport to 900x800 and navigate to /wallpapers (fresh, unfiltered)
      await app.wallpapersListPage.open();

      await expect(app.wallpapersListPage.filterCategory).toBeHidden();
      await expect(app.wallpapersListPage.filterTag).toBeHidden();
      await expect(app.wallpapersListPage.filterPrice).toBeHidden();
      await expect(app.wallpapersListPage.filterColor).toBeHidden();
      await expect(app.wallpapersListPage.filterSortBy).toBeHidden();

      await expect(app.wallpapersListPage.filtersChip).toBeVisible();
      await expect(app.wallpapersListPage.filtersChip).toHaveText('Filters');

      // 2. Record the hrefs of the first ~10 rendered cards, then click the "Filters" chip
      const hrefsBefore = (await app.wallpapersListPage.getCardsHref()).slice(0, 10);
      expect(hasUniqueValues(hrefsBefore)).toBe(true);
      expect(hrefsBefore.length).toBeGreaterThan(0);

      await app.wallpapersListPage.filtersChip.click();
      await app.wallpapersListPage.validateFiltersPanel();

      // 3. Every row opens to its own sub-view - checked for all five, not just the one this test
      // goes on to interact with, so a broken tab elsewhere doesn't slip through unnoticed.
      await app.wallpapersListPage.filtersPanelRow('Categories').click();
      await app.wallpapersListPage.validateCategoriesFilterPanelView();
      await app.wallpapersListPage.filtersPanelBackBtn.click();

      await app.wallpapersListPage.filtersPanelRow('Colors').click();
      await app.wallpapersListPage.validateColorsFilterPanelView();
      await app.wallpapersListPage.filtersPanelBackBtn.click();

      await app.wallpapersListPage.filtersPanelRow('Tags').click();
      await app.wallpapersListPage.validateTagsFilterPanelView();
      await app.wallpapersListPage.filtersPanelBackBtn.click();

      await app.wallpapersListPage.filtersPanelRow('Sort By').click();
      await app.wallpapersListPage.validateSortByFilterPanelView();
      await app.wallpapersListPage.filtersPanelBackBtn.click();

      await app.wallpapersListPage.filtersPanelRow('Price').click();
      await app.wallpapersListPage.validatePriceFilterPanelView({ free: false, paid: false });

      // 4. Click the "Free" checkbox (without closing the panel)
      await app.wallpapersListPage.filtersPanelFreeCheckbox.click();
      await expect(page).toHaveURL(/free=true/);

      // The row label updates live too, before Show Results is clicked
      await app.wallpapersListPage.filtersPanelBackBtn.click();
      await app.wallpapersListPage.validateFiltersPanel({ price: 'Free' });
      await app.wallpapersListPage.filtersPanelRow('Price').click();
      await app.wallpapersListPage.validatePriceFilterPanelView({ free: true, paid: false });

      // 5. Click "Show Results"
      await app.wallpapersListPage.filtersPanelShowResultsBtn.click();

      await expect(app.wallpapersListPage.filtersPanel).not.toBeAttached();
      await expect(page).toHaveURL(/free=true/);

      await app.wallpapersListPage.waitForCardsToUpdate(hrefsBefore);
      const hrefsAfter = await app.wallpapersListPage.getCardsHref();
      expect(hrefsAfter).not.toEqual(hrefsBefore);
      expect(hrefsAfter.length).toBeGreaterThan(0);
      expect(hasUniqueValues(hrefsAfter)).toBe(true);
      await app.wallpapersListPage.validateCardExistance('Paid', false);

      // Note: unlike the inline bar (WP-18/WP-19), the narrow panel exposes no separate "Reset All"
      // control next to the chip - clearing requires reopening the panel and using "Clear all" instead.
      await expect(app.wallpapersListPage.filtersChip).toHaveText('Filters (1)');
      await expect(app.wallpapersListPage.resetAllBtn).toBeHidden();

      // Reopening confirms the selection persisted, exercising the same validator's optional-state path
      await app.wallpapersListPage.filtersChip.click();
      await app.wallpapersListPage.validateFiltersPanel({ price: 'Free' });
      await app.wallpapersListPage.filtersPanelRow('Price').click();
      await app.wallpapersListPage.validatePriceFilterPanelView({ free: true, paid: false });
    }
  );
});
