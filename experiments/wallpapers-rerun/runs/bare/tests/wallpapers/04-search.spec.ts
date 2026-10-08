import { expect, test } from '../../fixtures/test';
import { SearchResultsPage } from '../../src/pages/search-results.page';
import { WallpaperDetailPage } from '../../src/pages/wallpaper-detail.page';
import { WallpaperFeedPage } from '../../src/pages/wallpaper-feed.page';
import { expectDetailHrefs } from './helpers';

test.describe('Wallpapers search (guest)', () => {
  test('header search from the wallpapers feed opens results for the term', async ({ page }) => {
    const feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    await feed.header.search('cat');
    await expect(page).toHaveURL(/\/find\/cat$/);
    const results = new SearchResultsPage(page);
    await expect(results.wallpapersViewAll).toBeVisible();
    await expect(results.wallpaperResults.first()).toBeVisible();
    expectDetailHrefs(await results.wallpaperResults.evaluateAll(a => a.map(x => x.getAttribute('href') ?? '')));
  });

  test('"View all" opens the wallpapers feed filtered by the keyword', async ({ page }) => {
    const results = new SearchResultsPage(page);
    await results.goto('cat');
    await results.wallpapersViewAll.click();
    await expect(page).toHaveURL(/\/wallpapers\?keyword=cat$/);
    const feed = new WallpaperFeedPage(page);
    await expect(feed.heading).toContainText(/cat/i);
    await feed.waitForCards(20);
  });

  test('keyword feed is scrollable and keeps the keyword when filters are applied', async ({ page }) => {
    const feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers?keyword=cat');
    await feed.waitForCards(20);
    await feed.choose('Price', 'Free', /free=true/);
    await expect(page).toHaveURL(/keyword=cat/);
    await expect(feed.heading).toContainText(/cat/i);
    await feed.waitForCards(5);
    await feed.expectNoPremiumCards();
  });

  test('a term with no matches yields a not-found page with suggestions, not an error', async ({ page }) => {
    const results = new SearchResultsPage(page);
    await results.goto('zxqvjwkpzzqq');
    await expect(results.notFoundHeading).toBeVisible();
    await expect(results.suggestions.first()).toBeVisible();
    expect(await results.wallpaperResults.count()).toBe(0);
  });

  test('suggested search term from the not-found page leads to real results', async ({ page }) => {
    const results = new SearchResultsPage(page);
    await results.goto('zxqvjwkpzzqq');
    await expect(results.suggestions.first()).toBeVisible();
    await results.suggestions.first().click();
    await expect(page).toHaveURL(/\/wallpapers\?keyword=.+/);
    await new WallpaperFeedPage(page).waitForCards();
  });

  test('search handles spaces, symbols and non-latin text without a server error', async ({ page }) => {
    for (const term of ['black cat', 'c&t "x"', 'кіт']) {
      const response = await page.goto(`/find/${encodeURIComponent(term)}`, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status(), term).toBeLessThan(500);
      await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('main')).first(), term).toBeVisible();
    }
  });

  // BUG-003: a literal "%" in the query makes the client throw URIError in a tight loop and freeze the tab.
  // BUG-003: a literal "%" in the query makes the client throw URIError in a tight loop and freeze the tab.
  // Uses its own context: the frozen page cannot be screenshotted or recorded, which would stall the
  // fixture teardown of the shared `page`.
  test('searching for a term with a percent sign does not crash the page script', async ({ browser, baseURL }) => {
    test.fail(true, 'BUG-003');
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      // Same URL the header search produces for "100%"; 'commit' because a looping page never finishes loading.
      const firstError = page
        .waitForEvent('console', { predicate: msg => /URIError/.test(msg.text()), timeout: 8000 })
        .then(
          () => true,
          () => false
        );
      await page.goto('/find/100%25', { waitUntil: 'commit' });
      const threwUriError = await firstError;
      // Stop at the first error: the page logs thousands per second and starves everything else.
      page.removeAllListeners('console');
      expect(threwUriError, 'client script threw URIError after searching "100%"').toBe(false);
    } finally {
      await Promise.race([context.close(), new Promise(resolve => setTimeout(resolve, 10_000))]);
    }
  });

  test('submitting an empty search does not break the page', async ({ page }) => {
    const feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    await feed.header.searchInput.press('Enter');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Something went wrong/i })).toBeHidden();
  });

  test('keyword chips on a wallpaper lead back to a keyword feed', async ({ page }) => {
    const feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    await feed.waitForCards();
    await feed.openCard(0);
    const detail = new WallpaperDetailPage(page);
    await detail.expectLoaded();
    test.skip(!(await detail.keywordLinks.count()), 'this wallpaper has no keywords');
    const href = (await detail.keywordLinks.first().getAttribute('href'))!;
    await expect(async () => {
      await detail.keywordLinks.first().click({ timeout: 3000 });
      await expect(page).toHaveURL(new RegExp(`${href.replace('?', '\\?')}$`), { timeout: 4000 });
    }).toPass();
    await expect(feed.heading).toBeVisible();
  });
});
