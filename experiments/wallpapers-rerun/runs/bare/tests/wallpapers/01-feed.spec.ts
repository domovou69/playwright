import { expect, test } from '../../fixtures/test';
import { hasUniqueValues } from '../../src/utils/helper';
import { WallpaperFeedPage } from '../../src/pages/wallpaper-feed.page';
import { WallpaperDetailPage } from '../../src/pages/wallpaper-detail.page';
import { expectDetailHrefs, expectThumbnailsServed } from './helpers';

test.describe('Wallpapers feed (guest)', () => {
  let feed: WallpaperFeedPage;

  test.beforeEach(async ({ page }) => {
    feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
  });

  test('feed renders heading, filter bar and a full first page of cards', async ({ page }) => {
    await expect(page).toHaveTitle(/wallpapers/i);
    await expect(feed.heading).toContainText(/wallpapers/i);
    for (const name of ['Wallpapers', 'Category', 'Price', 'Color', 'Sort by']) {
      await expect(page.getByRole('main').getByRole('button', { name, exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole('main').getByRole('combobox').first()).toContainText('Tag');
    await feed.waitForCards(20);
    expectDetailHrefs(await feed.cardHrefs());
  });

  test('card links are unique and thumbnails are served by the image server', async ({ page }) => {
    await feed.waitForCards(20);
    expect(hasUniqueValues(await feed.cardHrefs())).toBe(true);
    await expectThumbnailsServed(page);
  });

  test('scrolling loads additional cards without duplicates', async () => {
    await feed.waitForCards(20);
    const first = await feed.cardCount();
    const afterScroll = await feed.scrollToLoadMore();
    expect(afterScroll).toBeGreaterThan(first);
    const hrefs = await feed.cardHrefs();
    expectDetailHrefs(hrefs);
    expect(hasUniqueValues(hrefs)).toBe(true);
  });

  test('opening a card shows its detail page and Back returns to the feed', async ({ page }) => {
    await feed.waitForCards();
    const href = (await feed.cardHrefs())[0]!;
    await feed.openCard(0);
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await new WallpaperDetailPage(page).expectLoaded();
    await page.goBack();
    await expect(page).toHaveURL(/\/wallpapers$/);
    await feed.waitForCards();
  });

  test('categories block at the bottom links to category pages', async ({ page }) => {
    const links = page.locator('a[href^="/category/wallpapers/"]');
    await expect(links.first()).toBeAttached();
    expect(await links.count()).toBeGreaterThan(10);
    await expect(page.getByRole('heading', { level: 2, name: /wallpaper categories/i })).toBeAttached();
  });

  test('page is indexable: canonical points at itself and meta description is set', async ({ page }) => {
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/wallpapers\/?$/);
    await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /.{30,}/);
  });

  test('feed is usable on a phone viewport without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await feed.goto('/wallpapers');
    await feed.waitForCards(6);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
