// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { tags } from '../../src/utils/tags';
import type { AppPageObjects } from '../../pages/AppPageObjects';
import type { WallpaperCategoryType, TagsOptionType, ColorOptionType, PriceOptionType, SortByType } from '../../src/types/types';

type FilterName = 'Category' | 'Tag' | 'Color' | 'Price' | 'Sort by';

// Applies one filter option by name - the one place that knows which WallpapersListPage method
// a given filter maps to, so test cases below only carry data, never behavior.
async function applyFilter(app: AppPageObjects, filter: FilterName, option: string) {
  switch (filter) {
    case 'Category':
      return app.wallpapersListPage.filterByCategories([option as WallpaperCategoryType]);
    case 'Tag':
      return app.wallpapersListPage.filterByTag([option as TagsOptionType]);
    case 'Color':
      return app.wallpapersListPage.filterByColor([option as ColorOptionType]);
    case 'Price':
      return app.wallpapersListPage.filterByPrice([option as PriceOptionType]);
    case 'Sort by':
      return app.wallpapersListPage.filterBySortBy(option as SortByType);
  }
}

type SingleFilterCase = {
  filter: FilterName;
  option: string;
  urlContains: RegExp;
  extraInvariant?: 'noPriceBadge' | 'allPremiumWithPrice';
};

const singleFilterCases: SingleFilterCase[] = [
  { filter: 'Category', option: 'Nature', urlContains: /categories=NATURE/ },
  { filter: 'Tag', option: 'fall', urlContains: /tags=fall/ },
  { filter: 'Color', option: 'Pink', urlContains: /colors=pink/ },
  { filter: 'Price', option: 'Free', urlContains: /free=true/, extraInvariant: 'noPriceBadge' },
  { filter: 'Price', option: 'Paid', urlContains: /paid=true/, extraInvariant: 'allPremiumWithPrice' },
  { filter: 'Sort by', option: 'Most popular', urlContains: /sort=POPULAR/ },
];

type FilterStep = {
  filter: FilterName;
  option: string;
  urlContains: RegExp;
};

type PairwiseFilterCase = {
  name: string;
  steps: [FilterStep, FilterStep];
  extraInvariant: 'noPriceBadge' | 'hrefsChangeEachStep' | 'pricesNonIncreasing';
};

const pairwiseFilterCases: PairwiseFilterCase[] = [
  {
    name: 'Category=Anime + Price=Free',
    steps: [
      { filter: 'Category', option: 'Anime', urlContains: /categories=ANIME/ },
      { filter: 'Price', option: 'Free', urlContains: /free=true/ },
    ],
    extraInvariant: 'noPriceBadge',
  },
  {
    name: 'Color=Red + Tag=halloween',
    steps: [
      { filter: 'Color', option: 'Red', urlContains: /colors=red/ },
      { filter: 'Tag', option: 'halloween', urlContains: /tags=halloween/ },
    ],
    extraInvariant: 'hrefsChangeEachStep',
  },
  {
    name: 'Price=Paid + Sort by=Price: High to Low',
    steps: [
      { filter: 'Price', option: 'Paid', urlContains: /paid=true/ },
      { filter: 'Sort by', option: 'Price: High to Low', urlContains: /sort=PRICE_DESC/ },
    ],
    extraInvariant: 'pricesNonIncreasing',
  },
];

test.describe('Filtering', { tag: [tags.WALLPAPERS, tags.GUEST, tags.SMOKE] }, () => {
  test.beforeEach('Open unfiltered /wallpapers', async ({ app }) => {
    await app.wallpapersListPage.open();
  });

  for (const current of singleFilterCases) {
    test(`WP-19 ${current.filter}: ${current.option} filter applied alone updates results and URL`, async ({ app, page }) => {
      // 1. Record baseline card hrefs, apply the filter option
      const hrefsBefore = await app.wallpapersListPage.getCardsHref();
      await applyFilter(app, current.filter, current.option);

      await expect(page).toHaveURL(current.urlContains);

      await app.wallpapersListPage.waitForCardsToUpdate(hrefsBefore);
      const hrefsAfter = await app.wallpapersListPage.getCardsHref();
      expect(hrefsAfter).not.toEqual(hrefsBefore);
      expect(hrefsAfter.length).toBeGreaterThan(0);

      // extra invariant, per case
      if (current.extraInvariant === 'noPriceBadge') {
        // no card has a price badge
        await app.wallpapersListPage.validateCardExistance('Paid', false);
      } else if (current.extraInvariant === 'allPremiumWithPrice') {
        // every card has a crown and a price badge
        const allCount = await app.wallpapersListPage.cardsAll.count();
        expect(allCount).toBeGreaterThan(0);
        await expect(app.wallpapersListPage.cardsPremiumWithPrice).toHaveCount(allCount);
      }
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

  test('WP-20 Multiple options in one filter', { tag: [tags.WALLPAPERS, tags.GUEST, tags.REGRESSION] }, async ({ app, page }) => {
    // 1. Select Color = Black, record hrefs, then also select White
    // Keep the dialog open across both selections and the uncheck below - closing and reopening it
    // between clicks (via the isColorSelected/filterByColor helpers, which each open+close on their
    // own) was seen to occasionally drop a toggle live; one continuous session is what was verified.
    const hrefsBefore = await app.wallpapersListPage.getCardsHref();

    await app.wallpapersListPage.filterColor.click();
    await expect(app.wallpapersListPage.colorFilterDialog).toBeVisible();
    const blackOption = app.wallpapersListPage.colorFilterDialog.getByRole('option', { name: 'Black' });
    const whiteOption = app.wallpapersListPage.colorFilterDialog.getByRole('option', { name: 'White' });

    await blackOption.click();
    await expect(page).toHaveURL(/colors=black/);
    await app.wallpapersListPage.waitForCardsToUpdate(hrefsBefore);
    const hrefsBlackOnly = await app.wallpapersListPage.getCardsHref();

    await whiteOption.click();

    // expect: both options are checked in the dialog
    await expect(blackOption).toHaveAttribute('aria-checked', 'true');
    await expect(whiteOption).toHaveAttribute('aria-checked', 'true');

    // expect: both colors are in the URL - aria-checked updates before the URL sync catches up, so
    // wait for the URL itself to reflect the second selection rather than reading it immediately.
    await expect(page).toHaveURL(/white/);
    const colorsAfterBoth = new URL(page.url()).searchParams.get('colors') || '';
    expect(colorsAfterBoth).toContain('black');
    expect(colorsAfterBoth).toContain('white');

    // expect: card hrefs differ from the Black-only set
    await app.wallpapersListPage.waitForCardsToUpdate(hrefsBlackOnly);
    const hrefsBoth = await app.wallpapersListPage.getCardsHref();
    expect(hrefsBoth).not.toEqual(hrefsBlackOnly);

    // 2. Uncheck Black
    await blackOption.click();

    // expect: only White is checked and only White is in the URL
    await expect(blackOption).toHaveAttribute('aria-checked', 'false');
    await expect(whiteOption).toHaveAttribute('aria-checked', 'true');
    await expect(page).not.toHaveURL(/black/);
    const colorsAfterUncheck = new URL(page.url()).searchParams.get('colors') || '';
    expect(colorsAfterUncheck).not.toContain('black');
    expect(colorsAfterUncheck).toContain('white');

    // Close filter
    await app.wallpapersListPage.filterColor.click({ force: true });
    await expect(app.wallpapersListPage.colorFilterDialog).not.toBeAttached();
  });

  for (const current of pairwiseFilterCases) {
    test(`WP-21 Pairwise filter combinations: ${current.name}`, { tag: [tags.WALLPAPERS, tags.GUEST, tags.REGRESSION] }, async ({ app, page }) => {
      // Apply both filters in sequence; check the URL after each, and hrefs after each when that's
      // this case's invariant.
      let previousHrefs = await app.wallpapersListPage.getCardsHref();
      for (const step of current.steps) {
        await applyFilter(app, step.filter, step.option);
        await expect(page).toHaveURL(step.urlContains);

        if (current.extraInvariant === 'hrefsChangeEachStep') {
          await app.wallpapersListPage.waitForCardsToUpdate(previousHrefs);
          const hrefsAfterStep = await app.wallpapersListPage.getCardsHref();
          expect(hrefsAfterStep).not.toEqual(previousHrefs);
          previousHrefs = hrefsAfterStep;
        }
      }

      // extra invariant, after both filters
      if (current.extraInvariant === 'noPriceBadge') {
        // no card has a price badge
        await app.wallpapersListPage.validateCardExistance('Paid', false);
      } else if (current.extraInvariant === 'pricesNonIncreasing') {
        // prices of the first 10 cards are non-increasing
        const cards = (await app.wallpapersListPage.cardsAll.all()).slice(0, 10);
        const prices: number[] = [];
        for (const card of cards) {
          prices.push(await app.wallpapersListPage.getCardPriceBadgeTextAsNumber(card));
        }
        for (let i = 1; i < prices.length; i++) {
          expect(prices[i]!).toBeLessThanOrEqual(prices[i - 1]!);
        }
      }
    });
  }

  test('WP-34 Price range From/To limits card prices', { tag: [tags.WALLPAPERS, tags.GUEST, tags.REGRESSION] }, async ({ app, page }) => {
    // 1. Open the Price filter, set From = 50, To = 500
    await app.wallpapersListPage.setPriceRange(50, 500);

    await expect(page).toHaveURL(/minPrice=50/);
    await expect(page).toHaveURL(/maxPrice=500/);

    // expect: every rendered card has a price badge between 50 and 500 inclusive
    const cards = await app.wallpapersListPage.cardsAll.all();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const price = await app.wallpapersListPage.getCardPriceBadgeTextAsNumber(card);
      expect(price).toBeGreaterThanOrEqual(50);
      expect(price).toBeLessThanOrEqual(500);
    }
  });
});
