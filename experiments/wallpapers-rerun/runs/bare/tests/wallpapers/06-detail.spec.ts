import { expect, test } from '../../fixtures/test';
import { WallpaperDetailPage } from '../../src/pages/wallpaper-detail.page';
import { WallpaperFeedPage } from '../../src/pages/wallpaper-feed.page';
import { expectDetailHrefs, pickFromFeed } from './helpers';

test.describe('Wallpaper detail page (guest)', () => {
  let detail: WallpaperDetailPage;
  let path: string;

  test.beforeEach(async ({ page }) => {
    ({ href: path } = await pickFromFeed(page, '/wallpapers?free=true'));
    detail = new WallpaperDetailPage(page);
    await detail.goto(path);
    await detail.expectLoaded();
  });

  test('shows title, author, date, download count and a loaded preview image', async ({ page }) => {
    await expect(detail.title).not.toBeEmpty();
    await expect(detail.author).toBeVisible();
    await expect(page.locator('main a[href^="/profiles/"]').first()).toBeVisible();
    await expect(detail.dateLabel).toBeVisible();
    await expect(detail.downloadsCount).toBeVisible();
    await expect(detail.mainImage).toBeVisible();
    await expect
      .poll(() => detail.mainImage.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
      .toBe(true);
  });

  test('free wallpaper is not marked Premium and offers a plain Download', async () => {
    await expect(detail.premiumLabel).toBeHidden();
    await expect(detail.downloadButton).toBeEnabled();
  });

  test('document title and social metadata describe this wallpaper', async ({ page }) => {
    const heading = (await detail.title.innerText()).trim();
    await expect(page).toHaveTitle(new RegExp('ZEDGE', 'i'));
    expect(await page.title()).toContain(heading);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\//);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`${path}$`));
  });

  test('structured data is valid JSON and names the same wallpaper', async ({ page }) => {
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw ?? '');
    const graph: Array<Record<string, unknown>> = data['@graph'] ?? [data];
    const heading = (await detail.title.innerText()).trim();
    expect(
      graph.some(node => node.name === heading),
      'a node carries the wallpaper name'
    ).toBe(true);
  });

  test('Related section offers other wallpapers, and opening one navigates to it', async ({ page }) => {
    await expect(detail.relatedHeading).toBeVisible();
    const hrefs = (await detail.relatedCards.evaluateAll(a => a.map(x => x.getAttribute('href') ?? ''))).filter(
      h => h !== path
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(6);
    expectDetailHrefs(hrefs);
    await page.locator(`main a[href="${hrefs[0]}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`));
    await detail.expectLoaded();
  });

  test('keyword chips open the keyword feed', async ({ page }) => {
    test.skip(!(await detail.keywordLinks.count()), 'wallpaper has no keywords');
    const href = await detail.keywordLinks.first().getAttribute('href');
    await detail.keywordLinks.first().click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace('?', '\\?')}$`));
    await new WallpaperFeedPage(page).waitForCards();
  });

  test('guest sees Sign in in the header, not a signed-in state', async () => {
    await expect(detail.header.signInButton).toBeVisible();
  });
});

test.describe('Wallpaper detail: unknown ids', () => {
  test('well-formed but non-existent id is a 404 page', async ({ page }) => {
    const response = await new WallpaperDetailPage(page).goto('00000000-0000-0000-0000-000000000000');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /couldn’t find it/ })).toBeVisible();
  });

  test('malformed id does not produce a server error', async ({ page }) => {
    const response = await new WallpaperDetailPage(page).goto('not-a-uuid');
    expect(response?.status()).toBeLessThan(500);
  });
});
