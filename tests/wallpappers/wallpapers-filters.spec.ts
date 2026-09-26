// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { tags } from '../../src/utils/tags';
import type { AppPageObjects } from '../../pages/AppPageObjects';

type FilterCase = {
  filter: string;
  option: string;
  // URL param observed live for this filter option
  urlContains: RegExp;
  apply: (app: AppPageObjects) => Promise<void>;
  verifyExtra?: (app: AppPageObjects) => Promise<void>;
};

const cases: FilterCase[] = [
  {
    filter: 'Category',
    option: 'Nature',
    urlContains: /categories=NATURE/,
    apply: app => app.wallpapersListPage.filterByCategories(['Nature']),
  },
  {
    filter: 'Tag',
    option: 'fall',
    urlContains: /tags=fall/,
    apply: app => app.wallpapersListPage.filterByTag(['fall']),
  },
  {
    filter: 'Color',
    option: 'Pink',
    urlContains: /colors=pink/,
    apply: app => app.wallpapersListPage.filterByColor(['Pink']),
  },
  {
    filter: 'Price',
    option: 'Free',
    urlContains: /free=true/,
    apply: app => app.wallpapersListPage.filterByPrice(['Free']),
    verifyExtra: async app => {
      // no card has a price badge
      await app.wallpapersListPage.validateCardExistance('Paid', false);
    },
  },
  {
    filter: 'Price',
    option: 'Paid',
    urlContains: /paid=true/,
    apply: app => app.wallpapersListPage.filterByPrice(['Paid']),
    verifyExtra: async app => {
      // every card has a crown and a price badge
      const allCount = await app.wallpapersListPage.cardsAll.count();
      const premiumWithPriceCount = app.wallpapersListPage.cardsPremiumWithPrice;
      expect(allCount).toBeGreaterThan(0);
      await expect(premiumWithPriceCount).toHaveCount(allCount);
    },
  },
  {
    filter: 'Sort by',
    option: 'Most popular',
    urlContains: /sort=POPULAR/,
    apply: app => app.wallpapersListPage.filterBySortBy('Most popular'),
  },
];

test.describe('Filtering', { tag: [tags.WALLPAPERS, tags.GUEST, tags.SMOKE] }, () => {
  test.beforeEach('Open unfiltered /wallpapers', async ({ app }) => {
    await app.wallpapersListPage.open();
  });

  for (const c of cases) {
    test(`WP-19 ${c.filter}: ${c.option} filter applied alone updates results and URL`, async ({ app, page }) => {
      // 1. Record baseline card hrefs, apply the filter option
      const hrefsBefore = await app.wallpapersListPage.getCardsHref();
      await c.apply(app);

      await expect(page).toHaveURL(c.urlContains);

      await app.wallpapersListPage.waitForCardsToUpdate(hrefsBefore);
      const hrefsAfter = await app.wallpapersListPage.getCardsHref();
      expect(hrefsAfter).not.toEqual(hrefsBefore);
      expect(hrefsAfter.length).toBeGreaterThan(0);

      if (c.verifyExtra) await c.verifyExtra(app);
    });
  }

  test('WP-18 Reset All clears every active filter', async ({ app, page }) => {
    // 1. On unfiltered /wallpapers
    await expect(app.wallpapersListPage.resetAllBtn).toBeHidden();

    // 2. Apply Category=Nature and Price=Free
    await app.wallpapersListPage.filterByCategories(['Nature']);
    await app.wallpapersListPage.filterByPrice(['Free']);
    await expect(app.wallpapersListPage.resetAllBtn).toBeVisible();

    // 3. Click "Reset All"
    const hrefsBeforeReset = await app.wallpapersListPage.getCardsHref();
    await app.wallpapersListPage.clickResetAllFilters();

    await expect(page).not.toHaveURL(/categories|minPrice|maxPrice|colors|tags|sort|free=true|paid=true/);
    await expect(app.wallpapersListPage.resetAllBtn).toBeHidden();

    await app.wallpapersListPage.waitForCardsToUpdate(hrefsBeforeReset);
    const hrefsAfterReset = await app.wallpapersListPage.getCardsHref();
    expect(hrefsAfterReset).not.toEqual(hrefsBeforeReset);
  });
});
