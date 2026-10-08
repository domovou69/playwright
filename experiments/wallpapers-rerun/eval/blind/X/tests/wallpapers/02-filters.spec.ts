import { expect, test } from '../../fixtures/test';
import { WallpaperFeedPage } from '../../src/pages/wallpaper-feed.page';
import { expectDetailHrefs } from './helpers';

test.describe('Wallpapers filters (guest)', () => {
  let feed: WallpaperFeedPage;

  test.beforeEach(async ({ page }) => {
    feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    await feed.waitForCards();
  });

  test('Category offers the site categories', async () => {
    const labels = await feed.optionLabels('Category');
    expect(labels.length).toBeGreaterThanOrEqual(10);
    expect(labels).toEqual(expect.arrayContaining(['Nature', 'Animals']));
    expect(new Set(labels).size).toBe(labels.length);
  });

  test('Price offers Free and Paid, Color offers a palette', async () => {
    expect(await feed.optionLabels('Price')).toEqual(expect.arrayContaining(['Free', 'Paid']));
    const colors = await feed.optionLabels('Color');
    expect(colors.length).toBeGreaterThanOrEqual(5);
    expect(colors).toEqual(expect.arrayContaining(['Black', 'Blue']));
  });

  test('Free filter returns only free wallpapers, also after loading more', async () => {
    await feed.choose('Price', 'Free', /free=true/);
    await feed.waitForCards(20);
    await feed.expectNoPremiumCards();
    await feed.scrollToLoadMore();
    await feed.expectNoPremiumCards();
  });

  test('Paid filter returns only premium wallpapers with a price', async () => {
    await feed.choose('Price', 'Paid', /paid=true/);
    await feed.waitForCards(20);
    await feed.expectOnlyPremiumCards();
    expect(await feed.freeCards.count()).toBe(0);
  });

  test('Color filter is reflected in URL and the active filters, and still returns results', async ({ page }) => {
    await feed.choose('Color', 'Blue', /colors=blue/);
    await expect(feed.activeFiltersLabel).toContainText('(1)');
    await expect(page.getByRole('main').getByRole('button', { name: /^blue$/i })).toBeVisible();
    await feed.waitForCards(10);
    expectDetailHrefs(await feed.cardHrefs());
  });

  test('Category filter narrows the feed and supports several categories', async () => {
    await feed.choose('Category', 'Nature', /categories=NATURE/);
    await feed.waitForCards(10);
    const natureOnly = await feed.cardHrefs();
    await feed.choose('Category', 'Animals', /categories=NATURE(%2C|,)ANIMALS/);
    await expect.poll(() => feed.cardHrefs(), { message: 'feed refreshed for 2 categories' }).not.toEqual(natureOnly);
  });

  test('Tag filter applies a tag from the list', async ({ page }) => {
    const tag = await feed.selectFirstTag();
    await expect(page).toHaveURL(new RegExp(`tags=${tag}`, 'i'));
    await feed.waitForCards();
    await expect(
      page
        .getByRole('main')
        .getByText(new RegExp(`^${tag}$`, 'i'))
        .first()
    ).toBeVisible();
  });

  test('filters combine, and Reset All restores the unfiltered feed', async ({ page }) => {
    await feed.choose('Price', 'Free', /free=true/);
    await feed.choose('Color', 'Black', /colors=black/);
    await expect(page).toHaveURL(/free=true.*colors=black|colors=black.*free=true/);
    await feed.reset();
    await expect(feed.resetAll).toBeHidden();
    await feed.waitForCards(20);
  });

  test('filters from a shared URL are applied on load', async ({ page }) => {
    await feed.goto('/wallpapers?free=true&colors=blue');
    await expect(page.getByRole('main').getByRole('button', { name: /^blue$/i })).toBeVisible();
    await feed.waitForCards();
    await feed.expectNoPremiumCards();
  });

  test('browser Back undoes the last filter', async ({ page }) => {
    await feed.choose('Price', 'Free', /free=true/);
    await page.goBack();
    await expect(page).toHaveURL(/\/wallpapers$/);
    await feed.waitForCards();
  });

  test('removing a filter chip drops only that filter', async () => {
    await feed.goto('/wallpapers?colors=blue&free=true');
    await feed.removeChip(/^blue$/i, /\/wallpapers\?free=true$/);
    await feed.waitForCards();
  });

  test('filter value that matches nothing shows the empty state; removing its chip recovers', async () => {
    await feed.goto('/wallpapers?colors=notacolor');
    await expect(feed.emptyState).toBeVisible();
    expect(await feed.cardCount()).toBe(0);
    await feed.removeChip(/notacolor/i, /\/wallpapers$/);
    await feed.waitForCards();
  });

  test('Reset All also clears a filter value the site does not recognise', async () => {
    await feed.goto('/wallpapers?colors=notacolor');
    await feed.reset();
    await feed.waitForCards();
  });

  test('keyword with no matches shows the empty state', async () => {
    await feed.goto('/wallpapers?keyword=zxqvjwkpzzqq');
    await expect(feed.emptyState).toBeVisible();
    expect(await feed.cardCount()).toBe(0);
  });
});
