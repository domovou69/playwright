// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import type { Page } from '@playwright/test';
import type { AppPageObjects } from '../../pages/AppPageObjects';
import type { WallpaperCategoryType, TagsOptionType, ColorOptionType, PriceOptionType, SortByType } from '../../src/types/types';

type FilterName = 'Category' | 'Tag' | 'Color' | 'Price' | 'Sort by';

// Applies one filter option by name - the one place that knows which WallpapersListPage method
// a given filter maps to, so test cases below only carry data, never behavior.
async function applyFilter(app: AppPageObjects, filter: FilterName, option: string) {
  switch (filter) {
    case 'Category':
      return app.wallpapersListPage.filtersBar.filterByCategories([option as WallpaperCategoryType]);
    case 'Tag':
      return app.wallpapersListPage.filtersBar.filterByTag([option as TagsOptionType]);
    case 'Color':
      return app.wallpapersListPage.filtersBar.filterByColor([option as ColorOptionType]);
    case 'Price':
      return app.wallpapersListPage.filtersBar.filterByPrice([option as PriceOptionType]);
    case 'Sort by':
      return app.wallpapersListPage.filtersBar.filterBySortBy(option as SortByType);
  }
}

type SingleFilterCase = {
  filter: FilterName;
  option: string;
  urlContains: RegExp;
};

const singleFilterCases: SingleFilterCase[] = [
  { filter: 'Category', option: 'Nature', urlContains: /categories=NATURE/ },
  { filter: 'Tag', option: 'fall', urlContains: /tags=fall/ },
  { filter: 'Color', option: 'Pink', urlContains: /colors=pink/ },
  { filter: 'Sort by', option: 'Most popular', urlContains: /sort=POPULAR/ },
];

const freeFilter: SingleFilterCase = { filter: 'Price', option: 'Free', urlContains: /free=true/ };
const paidFilter: SingleFilterCase = { filter: 'Price', option: 'Paid', urlContains: /paid=true/ };

// Applies one filter and checks the URL; returns the card hrefs before and after so a caller can
// assert what changed.
async function validateFilterApplied(app: AppPageObjects, page: Page, current: SingleFilterCase) {
  const hrefsBefore = await app.wallpapersListPage.getCardsHref();
  await applyFilter(app, current.filter, current.option);
  await expect(page).toHaveURL(current.urlContains);

  await app.wallpapersListPage.waitForCardsToUpdate(hrefsBefore);
  const hrefsAfter = await app.wallpapersListPage.getCardsHref();
  expect(hrefsAfter).not.toEqual(hrefsBefore);
  expect(hrefsAfter.length).toBeGreaterThan(0);
}

async function validateStepApplied(app: AppPageObjects, page: Page, step: SingleFilterCase) {
  await applyFilter(app, step.filter, step.option);
  await expect(page).toHaveURL(step.urlContains);
}

test.describe('Filtering', { tag: ['@wallpapers', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /wallpapers', async ({ app }) => {
    await app.wallpapersListPage.open();
  });

  for (const current of singleFilterCases) {
    test(`WP-19 ${current.filter}: ${current.option} filter applied alone updates results and URL`, { tag: ['@smoke'] }, async ({ app, page }) => {
      await validateFilterApplied(app, page, current);
    });
  }

  test('WP-19 Price: Free filter applied alone updates results and URL', { tag: ['@smoke'] }, async ({ app, page }) => {
    await validateFilterApplied(app, page, freeFilter);

    // no card has a price badge
    await app.wallpapersListPage.validateCardExistance('Paid', false);
  });

  test('WP-19 Price: Paid filter applied alone updates results and URL', { tag: ['@smoke'] }, async ({ app, page }) => {
    await validateFilterApplied(app, page, paidFilter);

    // every card has a crown and a price badge
    await app.wallpapersListPage.validateAllCardsPremiumWithPrice();
  });

  test('WP-18 Reset All clears every active filter', { tag: ['@smoke'] }, async ({ app, page }) => {
    // 1. On unfiltered /wallpapers
    await expect(app.wallpapersListPage.filtersBar.resetAllBtn).toBeHidden();

    // 2. Apply Category=Nature and Price=Free
    await app.wallpapersListPage.filtersBar.filterByCategories(['Nature']);
    await app.wallpapersListPage.filtersBar.filterByPrice(['Free']);
    await expect(app.wallpapersListPage.filtersBar.resetAllBtn).toBeVisible();

    // 3. Click "Reset All"
    const hrefsBeforeReset = await app.wallpapersListPage.getCardsHref();
    await app.wallpapersListPage.filtersBar.clickResetAll();

    await expect(page).not.toHaveURL(/categories|minPrice|maxPrice|colors|tags|sort|free=true|paid=true/);
    await expect(app.wallpapersListPage.filtersBar.resetAllBtn).toBeHidden();

    await app.wallpapersListPage.waitForCardsToUpdate(hrefsBeforeReset);
    const hrefsAfterReset = await app.wallpapersListPage.getCardsHref();
    expect(hrefsAfterReset).not.toEqual(hrefsBeforeReset);
  });

  test('WP-20 Multiple options in one filter', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Select Color = Black, record hrefs, then also select White
    // Keep the dialog open across both selections and the uncheck below - closing and reopening it
    // between clicks (via the isColorSelected/filterByColor helpers, which each open+close on their
    // own) was seen to occasionally drop a toggle live; one continuous session is what was verified.
    const hrefsBefore = await app.wallpapersListPage.getCardsHref();

    await app.wallpapersListPage.filtersBar.filterColor.click();
    await expect(app.wallpapersListPage.filtersBar.colorFilterDialog).toBeVisible();
    const blackOption = app.wallpapersListPage.filtersBar.colorFilterDialog.getByRole('option', { name: 'Black' });
    const whiteOption = app.wallpapersListPage.filtersBar.colorFilterDialog.getByRole('option', { name: 'White' });

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
    await app.wallpapersListPage.filtersBar.closeFilter();
  });

  test('WP-21 Pairwise filter combinations: Category=Anime + Price=Free', { tag: ['@regression'] }, async ({ app, page }) => {
    await validateStepApplied(app, page, { filter: 'Category', option: 'Anime', urlContains: /categories=ANIME/ });
    await validateStepApplied(app, page, freeFilter);

    // no card has a price badge
    await app.wallpapersListPage.validateCardExistance('Paid', false);
  });

  test('WP-21 Pairwise filter combinations: Color=Red + Tag=halloween', { tag: ['@regression'] }, async ({ app, page }) => {
    const hrefsBefore = await app.wallpapersListPage.getCardsHref();
    await validateStepApplied(app, page, { filter: 'Color', option: 'Red', urlContains: /colors=red/ });
    await app.wallpapersListPage.waitForCardsToUpdate(hrefsBefore);
    const hrefsAfterColor = await app.wallpapersListPage.getCardsHref();
    expect(hrefsAfterColor).not.toEqual(hrefsBefore);

    await validateStepApplied(app, page, { filter: 'Tag', option: 'halloween', urlContains: /tags=halloween/ });
    await app.wallpapersListPage.waitForCardsToUpdate(hrefsAfterColor);
    expect(await app.wallpapersListPage.getCardsHref()).not.toEqual(hrefsAfterColor);
  });

  test('WP-21 Pairwise filter combinations: Price=Paid + Sort by=Price: High to Low', { tag: ['@regression'] }, async ({ app, page }) => {
    await validateStepApplied(app, page, paidFilter);
    await validateStepApplied(app, page, { filter: 'Sort by', option: 'Price: High to Low', urlContains: /sort=PRICE_DESC/ });

    // prices of the first 10 cards are non-increasing
    await app.wallpapersListPage.expectCardPricesNonIncreasing();
  });

  test('WP-34 Price range From/To limits card prices', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Open the Price filter, set From = 50, To = 500
    await app.wallpapersListPage.filtersBar.setPriceRange(50, 500);

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

  test('WP-23 Filters are restored from a deep link', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Navigate to `/wallpapers?categories=NATURE&sort=PRICE_DESC&minPrice=1`
    await app.wallpapersListPage.open('/wallpapers?categories=NATURE&sort=PRICE_DESC&minPrice=1');

    // expect: Category shows "Nature" as selected
    expect(await app.wallpapersListPage.filtersBar.isCategorySelected('Nature')).toBe(true);

    // expect: Sort by shows "Price: High to Low"
    expect(await app.wallpapersListPage.filtersBar.isSortBySelected('Price: High to Low')).toBe(true);

    // expect: Price shows Paid - a deep-linked minPrice is reflected in the Price dialog's "From" input,
    // not the Free/Paid checkbox options (those stay unchecked for a plain minPrice deep link); From=1
    // is what makes the results paid-only here, so that's the value asserted below.
    expect(await app.wallpapersListPage.filtersBar.getPriceFromValue()).toBe('1');

    // expect: every card has a price badge
    const cards = await app.wallpapersListPage.cardsAll.all();
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(await app.wallpapersListPage.cardHasPriceBadge(card)).toBe(true);
    }

    // expect: prices of the first 10 cards are non-increasing
    await app.wallpapersListPage.expectCardPricesNonIncreasing();
  });
});
