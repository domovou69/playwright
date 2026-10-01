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
    const filtersBar = app.ringtonesListPage.filtersBar;
    await expect(filtersBar.labelChip).toBeVisible();
    await expect(filtersBar.filterCategory).toBeVisible();
    await expect(filtersBar.filterTag).toBeVisible();
    await expect(filtersBar.filterPrice).toBeVisible();
    await expect(filtersBar.filterDuration).toBeVisible();
    await expect(filtersBar.filterSortBy).toBeVisible();
    await expect(filtersBar.resetAllBtn).not.toBeAttached();

    // 4. Check the first 24 cards
    await app.ringtonesListPage.validateFirstCards(24);
  });
});
