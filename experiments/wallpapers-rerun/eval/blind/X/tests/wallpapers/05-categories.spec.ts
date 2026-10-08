import { expect, test } from '../../fixtures/test';
import { CategoryPage } from '../../src/pages/category.page';
import { WallpaperFeedPage } from '../../src/pages/wallpaper-feed.page';
import { expectDetailHrefs, statusOf } from './helpers';

test.describe('Wallpaper categories (guest)', () => {
  test('category page has heading, SEO title, canonical and a full grid', async ({ page }) => {
    const category = new CategoryPage(page);
    await category.open('nature');
    await expect(category.heading).toContainText(/nature/i);
    await expect(page).toHaveTitle(/nature/i);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/category\/wallpapers\/nature$/);
    await category.waitForCards(20);
    expectDetailHrefs(await category.cardHrefs());
  });

  test('category grid scrolls to load more', async ({ page }) => {
    const category = new CategoryPage(page);
    await category.open('nature');
    await category.waitForCards(20);
    expect(await category.scrollToLoadMore()).toBeGreaterThan(24);
  });

  test('related-category chips navigate to another category page', async ({ page }) => {
    const category = new CategoryPage(page);
    await category.open('nature');
    const related = page.getByRole('main').locator('a[href^="/category/wallpapers/"]:not([href$="/nature"])').first();
    await expect(related).toBeVisible();
    const href = await related.getAttribute('href');
    await related.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await category.waitForCards();
  });

  test('header Categories menu lists wallpaper categories that open the filtered feed', async ({ page }) => {
    const feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    await feed.openCategoriesMenu();
    const link = page.locator('a[href^="/wallpapers?categories="]').filter({ hasText: 'Animals' }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/categories=ANIMALS/);
    await feed.waitForCards(10);
  });

  test('a sample of popular category links from the feed footer all resolve', async ({ page, request }) => {
    const feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    const hrefs = await page
      .locator('a[href^="/category/wallpapers/"]')
      .evaluateAll(a => [...new Set(a.map(x => x.getAttribute('href') ?? ''))]);
    expect(hrefs.length).toBeGreaterThan(10);
    const sample = [hrefs[0]!, hrefs[Math.floor(hrefs.length / 2)]!, hrefs[hrefs.length - 1]!];
    for (const href of sample) expect(await statusOf(request, href), href).toBe(200);
  });

  test('unknown category is a proper 404 page with a way back', async ({ page }) => {
    const response = await page.goto('/category/wallpapers/zzzznotacategory', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /couldn’t find it/ })).toBeVisible();
    await expect(page.getByRole('link').filter({ hasText: /\S/ }).first()).toBeVisible();
  });

  test('category URL with a trailing slash resolves to the canonical page', async ({ page }) => {
    await page.goto('/category/wallpapers/nature/', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/category\/wallpapers\/nature$/);
  });
});
