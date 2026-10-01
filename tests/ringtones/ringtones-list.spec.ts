// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('List Page', { tag: ['@ringtones', '@guest'] }, () => {
  test('RT-01 List page loads with header, filter bar and valid cards', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Open /ringtones
    await app.ringtonesListPage.open();
    await expect(app.ringtonesListPage.ringtonesTitle).toBeVisible();
    await expect(app.ringtonesListPage.ringtonesTitle).toContainText('Ringtones');
    await expect(page).toHaveURL(/\/ringtones$/);

    // 2. Check the header
    await app.ringtonesListPage.validateHeader();

    // 3. Check the filter bar: Category, Tag, Price, Duration, Sort by
    // expect: all visible; "Reset All" is not present
    await app.ringtonesListPage.filtersBar.validateVisible();

    // 4. Check the first cards (up to 24, as many as are loaded)
    await app.ringtonesListPage.cards.validateFirst(24);
  });
});
