// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Category Navigation', { tag: ['@notification-sounds', '@guest'] }, () => {
  test('NS-06 Header "Categories" menu opens a category in the list page', { tag: ['@smoke'] }, async ({ app, page }) => {
    await app.notificationSoundsListPage.open();

    // 1. Click the header "Categories" button
    await app.notificationSoundsListPage.categories.click();
    await app.notificationSoundsListPage.validateCategoriesDialog();

    // 2. In the Notification Sounds group click "Pop"
    await app.notificationSoundsListPage.selectCategory('Notification sounds', 'Pop');
    await expect(page).toHaveURL(/\/notification-sounds\?categories=POP$/);
    await expect(app.notificationSoundsListPage.cardsAll.first()).toBeVisible();
    await app.notificationSoundsListPage.filtersBar.validateCategoryApplied('Pop');
  });
});
