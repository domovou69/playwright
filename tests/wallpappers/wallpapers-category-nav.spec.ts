// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { tags } from '../../src/utils/tags';

test.describe('Category Navigation', () => {
  test(
    'WP-10 Header "Categories" menu opens a category in the list page',
    { tag: [tags.WALLPAPERS, tags.GUEST, tags.SMOKE] },
    async ({ app, page }) => {
      await app.wallpapersListPage.open();

      // 1. Click the header "Categories" button
      await app.wallpapersListPage.categories.click();
      await expect(app.wallpapersListPage.categoriesDialog).toBeVisible();
      await expect(app.wallpapersListPage.categoriesDialog.getByText('Wallpapers', { exact: true })).toBeVisible();
      await expect(app.wallpapersListPage.categoriesDialog.getByText('Ringtones', { exact: true })).toBeVisible();
      await expect(app.wallpapersListPage.categoriesDialog.getByText('Notification Sounds', { exact: true })).toBeVisible();

      // 2. In the Wallpapers group click "Nature"
      await app.wallpapersListPage.selectCategory('Wallpapers', 'Nature');
      await expect(page).toHaveURL(/\/wallpapers\?categories=NATURE$/);

      await expect(app.wallpapersListPage.cardsAll.first()).toBeVisible();
      expect(await app.wallpapersListPage.cardsAll.count()).toBeGreaterThan(0);

      expect(await app.wallpapersListPage.isCategorySelected('Nature')).toBe(true);
    }
  );
});
