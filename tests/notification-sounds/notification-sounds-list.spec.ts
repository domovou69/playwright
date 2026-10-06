// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('List Page', { tag: ['@notification-sounds', '@guest'] }, () => {
  test('NS-01 List page loads with header, filter bar and valid cards', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Open /notification-sounds
    await app.notificationSoundsListPage.open();
    await expect(app.notificationSoundsListPage.title).toBeVisible();
    await expect(app.notificationSoundsListPage.title).toContainText('Notification Sounds');
    await expect(page).toHaveURL(/\/notification-sounds$/);

    // 2. Check the header
    await app.notificationSoundsListPage.validateHeader();

    // 3. Check the filter bar: label chip, Category, Tag, Price, Duration, Sort by; no "Reset All"
    await app.notificationSoundsListPage.filtersBar.validateVisible();

    // 4. Check the first cards (up to 24, as many as are loaded)
    await app.notificationSoundsListPage.cards.validateFirst(24);
  });
});
