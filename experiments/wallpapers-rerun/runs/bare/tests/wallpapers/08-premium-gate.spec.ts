import { expect, test } from '../../fixtures/test';
import { WallpaperDetailPage } from '../../src/pages/wallpaper-detail.page';
import { WallpaperFeedPage } from '../../src/pages/wallpaper-feed.page';
import { feedItems, pickFromFeed } from './helpers';

// Guest-only: we open the gate and look at it. Nothing in it (Login, Buy Credits) is ever clicked.
test.describe('Premium wallpapers and the guest gate', () => {
  test('premium cards show a price, free cards show none', async ({ page }) => {
    const feed = new WallpaperFeedPage(page);
    await feed.goto('/wallpapers');
    await feed.waitForCards(20);
    const prices = await feed.cardPrices();
    expect(
      prices.some(p => p > 0),
      'default feed mixes in premium items'
    ).toBe(true);
    expect(
      prices.some(p => p === 0),
      'default feed mixes in free items'
    ).toBe(true);
    expect(await feed.premiumCards.count()).toBe(prices.filter(p => p > 0).length);
  });

  test('premium detail page is labelled Premium and shows the card price', async ({ page }) => {
    const { href, price } = await pickFromFeed(page, '/wallpapers?paid=true&sort=PRICE_ASC', p => p > 0);
    const detail = new WallpaperDetailPage(page);
    await detail.goto(href);
    await expect(detail.title).toBeVisible();
    await expect(detail.premiumLabel).toBeVisible();
    await expect(
      page.getByRole('main').getByText(String(price), { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
  });

  test.describe('Download on a standard-priced premium wallpaper', () => {
    let detail: WallpaperDetailPage;
    let path: string;

    // Not every priced item is unlocked through the Download gate (some are sold with "Buy for"), so walk
    // the standard-priced candidates until one offers Download.
    test.beforeEach(async ({ page }) => {
      detail = new WallpaperDetailPage(page);
      const candidates = (await feedItems(page, '/wallpapers?paid=true')).filter(i => i.price === 10).slice(0, 6);
      for (const { href } of candidates) {
        await detail.goto(href);
        await expect(detail.title).toBeVisible();
        if (await detail.downloadButton.isVisible()) {
          path = href;
          return;
        }
      }
      test.skip(true, 'no standard-priced premium item with an unlock Download in the first page of results');
    });

    test('opens the unlock dialog offering login or credits, and starts no download', async ({ page }) => {
      let downloaded = false;
      page.on('download', () => (downloaded = true));
      await detail.openGate();
      await expect(detail.gate.title).toBeVisible();
      await expect(detail.gate.loginAndWatchAd).toBeVisible();
      await expect(detail.gate.buyCredits).toBeVisible();
      await expect(detail.gate.dialog).toContainText(/Login to unlock \d+ free premium downloads daily/);
      await page.waitForTimeout(1500);
      expect(downloaded, 'premium file must not download for a guest').toBe(false);
    });

    test('the dialog can be closed and the page stays usable', async ({ page }) => {
      await detail.openGate();
      await detail.gate.closeButton.click();
      await expect(detail.gate.dialog).toBeHidden();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(detail.downloadButton).toBeEnabled();
    });

    test('the dialog reopens after being closed', async () => {
      await detail.openGate();
      await detail.gate.closeButton.click();
      await expect(detail.gate.dialog).toBeHidden();
      await detail.openGate();
    });

    test('Escape closes the dialog', async ({ page }) => {
      await detail.openGate();
      await page.keyboard.press('Escape');
      await expect(detail.gate.dialog).toBeHidden();
    });
  });

  test('the most expensive premium wallpapers are offered as Buy, not as a free-unlock Download', async ({ page }) => {
    const { href, price } = await pickFromFeed(page, '/wallpapers?paid=true&sort=PRICE_DESC', p => p > 0);
    const detail = new WallpaperDetailPage(page);
    await detail.goto(href);
    await expect(detail.premiumLabel).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: /^Buy for/ })).toContainText(String(price));
  });
});
