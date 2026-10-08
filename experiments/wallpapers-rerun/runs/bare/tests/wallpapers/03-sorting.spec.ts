import { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test';
import { WallpaperFeedPage, SortOption } from '../../src/pages/wallpaper-feed.page';
import { WallpaperDetailPage } from '../../src/pages/wallpaper-detail.page';
import { expectDetailHrefs, parseZedgeDate } from './helpers';

const SORTS: { label: SortOption; url: RegExp }[] = [
  { label: 'Newest first', url: /sort=NEWEST/ },
  { label: 'Most popular', url: /sort=POPULAR/ },
  { label: 'Price: Low to High', url: /sort=PRICE_ASC/ },
  { label: 'Price: High to Low', url: /sort=PRICE_DESC/ },
];

test.describe('Wallpapers sorting (guest)', () => {
  let feed: WallpaperFeedPage;

  test.beforeEach(async ({ page }) => {
    feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    await feed.waitForCards();
  });

  test('Sort by offers the five orderings', async () => {
    expect(await feed.optionLabels('Sort by')).toEqual([
      'Relevance',
      'Newest first',
      'Price: Low to High',
      'Price: High to Low',
      'Most popular',
    ]);
  });

  for (const { label, url } of SORTS) {
    test(`"${label}" updates the URL, shows an active chip and a full feed`, async ({ page }) => {
      await feed.sortBy(label, url);
      await feed.waitForCards(20);
      expectDetailHrefs(await feed.cardHrefs());
      await expect(page.getByRole('main').getByRole('button', { name: label, exact: true })).toBeVisible();
    });
  }

  test('Price: High to Low orders the loaded cards by descending price', async () => {
    await feed.sortBy('Price: High to Low', /sort=PRICE_DESC/);
    await feed.waitForCards(20);
    await feed.scrollToLoadMore();
    const prices = await feed.cardPrices();
    expect(prices.some(p => p > 0)).toBe(true);
    expect(prices, 'prices non-increasing').toEqual([...prices].sort((a, b) => b - a));
  });

  test('Price: Low to High orders the loaded cards by ascending price', async () => {
    await feed.sortBy('Price: Low to High', /sort=PRICE_ASC/);
    await feed.waitForCards(20);
    await feed.scrollToLoadMore();
    const prices = await feed.cardPrices();
    expect(prices, 'prices non-decreasing').toEqual([...prices].sort((a, b) => a - b));
  });

  async function publishDates(page: Page, hrefs: string[]) {
    const detail = new WallpaperDetailPage(page);
    const dates: Date[] = [];
    for (const href of hrefs) {
      await detail.goto(href);
      await expect(detail.dateLabel).toBeVisible();
      dates.push(parseZedgeDate(await detail.dateLabel.innerText()));
    }
    return dates;
  }

  function expectNonIncreasing(dates: Date[]) {
    for (let i = 1; i < dates.length; i++) {
      expect(
        dates[i]!.getTime(),
        `item ${i} (${dates[i]!.toISOString()}) is newer than item ${i - 1} (${dates[i - 1]!.toISOString()})`
      ).toBeLessThanOrEqual(dates[i - 1]!.getTime());
    }
  }

  // BUG-002: premium wallpapers with older publish dates are interleaved with items from today.
  test('Newest first lists wallpapers by non-increasing publish date', async ({ page }) => {
    test.fail(true, 'BUG-002');
    test.setTimeout(180_000);
    await feed.sortBy('Newest first', /sort=NEWEST/);
    await feed.waitForCards(10);
    const dates = await publishDates(page, (await feed.cardHrefs()).slice(0, 10));
    // Live data: the interleaving only shows when older premium items are ranked in the first cards.
    const ordered = dates.every((d, i) => i === 0 || d.getTime() <= dates[i - 1]!.getTime());
    test.skip(ordered, 'BUG-002 not reproducible with the current live ordering');
    expectNonIncreasing(dates);
  });

  test('sort is kept when a filter is added, and both are in the URL', async ({ page }) => {
    await feed.sortBy('Newest first', /sort=NEWEST/);
    await feed.choose('Price', 'Free', /free=true/);
    await expect(page).toHaveURL(/sort=NEWEST/);
    await feed.waitForCards(10);
    await feed.expectNoPremiumCards();
  });

  test('sorted feed loads from a shared URL', async ({ page }) => {
    await feed.goto('/wallpapers?sort=POPULAR');
    await feed.waitForCards(20);
    await expect(page.getByRole('main').getByRole('button', { name: 'Most popular', exact: true })).toBeVisible();
  });

  // BUG-001: unknown sort value crashes the page with HTTP 500 instead of falling back to the default.
  test('unknown sort value falls back gracefully', async () => {
    test.fail(true, 'BUG-001');
    const response = await feed.goto('/wallpapers?sort=BOGUS');
    expect(response?.status()).toBeLessThan(500);
    await feed.waitForCards();
  });
});
