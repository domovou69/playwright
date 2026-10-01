// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Category Navigation', { tag: ['@ringtones', '@guest'] }, () => {
  test('RT-06 Header "Categories" menu opens a category in the list page', { tag: ['@smoke'] }, async ({ app, page }) => {
    await app.ringtonesListPage.open();

    // 1. Click the header "Categories" button
    await app.ringtonesListPage.categories.click();
    await app.ringtonesListPage.validateCategoriesDialog();

    // 2. In the Ringtones group click "Pop"
    await app.ringtonesListPage.selectCategory('Ringtones', 'Pop');
    await expect(page).toHaveURL(/\/ringtones\?categories=POP$/);
    await expect(app.ringtonesListPage.cardsAll.first()).toBeVisible();
    await app.ringtonesListPage.filtersBar.validateCategoryApplied('Pop');
  });

  test('RT-07 "Explore different ringtone categories" opens a category page with sub-filters', { tag: ['@regression'] }, async ({ app, page }) => {
    await app.ringtonesListPage.open();

    // 1. On /ringtones scroll to "Explore different ringtone categories" and click "Blues"
    await app.ringtonesListPage.explore.heading.scrollIntoViewIfNeeded();
    await app.ringtonesListPage.explore.link('Blues').click();

    await expect(page).toHaveURL(/\/category\/ringtones\/blues$/);
    await expect(app.ringtonesListPage.ringtonesTitle).toBeVisible();
    await expect(app.ringtonesListPage.cardsAll.first()).toBeVisible();

    // 2. Record the URL and H1, then select a different sub-filter: both change and the page lists valid cards.
    // Not asserted: that the cards differ (a related category such as Blue can return the same list as Blues) and the Explore
    // block on the category page itself (bug candidate 1 in the plan).
    const urlBefore = page.url();
    const h1Before = await app.ringtonesListPage.ringtonesTitle.innerText();

    await app.ringtonesListPage.explore.selectDifferentSubFilter();

    await expect(page).not.toHaveURL(urlBefore);
    await expect(page).toHaveURL(/\/category\/ringtones\/[a-z0-9-]+$/);
    await expect(app.ringtonesListPage.ringtonesTitle).not.toHaveText(h1Before);
    await app.ringtonesListPage.cards.validateFirst(24);
  });
});
