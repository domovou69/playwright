import { APIRequestContext, expect, Page } from '@playwright/test';

export const UUID_PATH = /^\/wallpapers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A card link is a valid wallpaper detail link. */
export function expectDetailHrefs(hrefs: string[]) {
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect(href, `bad card link ${href}`).toMatch(UUID_PATH);
}

/**
 * Card thumbnails are CSS background images, so a broken one is invisible to the DOM. Resolve the
 * background URL of the first `sample` cards and make sure the image server answers with an image.
 */
export async function expectThumbnailsServed(page: Page, sample = 8) {
  const urls = await page
    .locator('main a[href^="/wallpapers/"] [style*="background-image"][style*="image-server"]')
    .evaluateAll(
      (els, n) =>
        els.slice(0, n).map(e => /url\("?([^")]+)"?\)/.exec((e as HTMLElement).style.backgroundImage)?.[1] ?? ''),
      sample
    );
  expect(urls.length, 'cards with a thumbnail').toBeGreaterThan(0);
  for (const url of urls) {
    const res = await page.request.get(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()['content-type'], url).toMatch(/^image\//);
    expect((await res.body()).length, url).toBeGreaterThan(1000);
  }
}

/** "2026 Oct 7" -> Date */
export function parseZedgeDate(text: string): Date {
  const d = new Date(`${text.trim()} UTC`);
  expect(Number.isNaN(d.getTime()), `unparsable date "${text}"`).toBe(false);
  return d;
}

export async function statusOf(request: APIRequestContext, path: string) {
  return (await request.get(path, { maxRedirects: 5 })).status();
}

/** Picks a wallpaper detail path from a feed URL, e.g. the cheapest premium one or any free one. */
export async function pickFromFeed(page: Page, feedUrl: string, predicate?: (price: number) => boolean) {
  await page.goto(feedUrl, { waitUntil: 'domcontentloaded' });
  const cards = page.locator('main a[href^="/wallpapers/"]');
  await expect(cards.first()).toBeVisible();
  const items = await cards.evaluateAll(links =>
    links.map(a => {
      const text = (a as HTMLElement).innerText.trim();
      return {
        href: a.getAttribute('href') ?? '',
        price: /^\d+$/.test(text) ? Number(text) : 0,
      };
    })
  );
  const found = items.find(i => (predicate ? predicate(i.price) : true));
  expect(found, `no matching card in ${feedUrl}`).toBeDefined();
  return found!;
}

/** All cards of a feed with their price, in feed order. */
export async function feedItems(page: Page, feedUrl: string) {
  await page.goto(feedUrl, { waitUntil: 'domcontentloaded' });
  const cards = page.locator('main a[href^="/wallpapers/"]');
  await expect(cards.first()).toBeVisible();
  return cards.evaluateAll(links =>
    links.map(a => {
      const text = (a as HTMLElement).innerText.trim();
      return { href: a.getAttribute('href') ?? '', price: /^\d+$/.test(text) ? Number(text) : 0 };
    })
  );
}
