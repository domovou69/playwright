// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('List Page', () => {
  test('WP-01 List page loads with header, filter bar and valid cards', { tag: ['@wallpapers', '@guest', '@regression'] }, async ({ app, page }) => {
    // 1. Open /wallpapers
    await app.wallpapersListPage.open();
    await expect(app.wallpapersListPage.wallpaperTitle).toBeVisible();
    await expect(page).toHaveURL(/\/wallpapers$/);

    // 2. Check the header: logo, Categories, search filter chip + input + Search button, Sign in
    // expect: all visible and enabled; the search cancel control is not present while the input is empty
    await app.wallpapersListPage.validateHeader();

    // 3. Check the filter bar: Category, Tag, Price, Color, Sort by
    // expect: all five visible; "Reset All" is not present
    await expect(app.wallpapersListPage.filterCategory).toBeVisible();
    await expect(app.wallpapersListPage.filterTag).toBeVisible();
    await expect(app.wallpapersListPage.filterPrice).toBeVisible();
    await expect(app.wallpapersListPage.filterColor).toBeVisible();
    await expect(app.wallpapersListPage.filterSortBy).toBeVisible();
    await expect(app.wallpapersListPage.resetAllBtn).not.toBeAttached();

    // 4. Check the first 20 cards (skip "Download app" and ad tiles)
    // expect: every href matches ^/wallpapers/[a-f0-9-]{36}$
    // expect: every title is non-empty and equals the aria-label
    // expect: every premium card (crown badge) has a digits-only price badge; free cards have no price badge
    const cardCount = await app.wallpapersListPage.cardsAll.count();
    const cards = Array.from({ length: Math.min(20, cardCount) }, (_, i) => app.wallpapersListPage.cardsAll.nth(i));
    expect(cards.length).toBeGreaterThan(0);

    let premiumWithPriceCount = 0;
    for (const card of cards) {
      await app.wallpapersListPage.validateCommonWallpaper(card);

      if (await app.wallpapersListPage.cardHasPriceBadge(card)) {
        await app.wallpapersListPage.validatePremiumWallpaper(card);
        premiumWithPriceCount++;
      } else {
        await expect(card.locator('div[class*="card-footer"]')).not.toBeAttached();
      }
    }
    expect(premiumWithPriceCount).toBeGreaterThan(0);
  });
});
