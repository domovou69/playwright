import { expect, Locator, Page } from '@playwright/test';
import { dismissCookieBanner } from '../src/utils/helper';
import { CardGrid } from './CardGrid';

const LOAD_TIMEOUT = 30_000;

/** `/wallpapers/<GUID>`: title, artist, downloads text, keyword chips, preview image, Share and the Related cards. */
export class WallpaperDetailPage {
  readonly title: Locator;
  readonly artist: Locator;
  readonly downloadsText: Locator;
  readonly keywordChips: Locator;
  readonly previewImage: Locator;
  readonly premiumLabel: Locator;
  readonly buyButton: Locator;
  readonly downloadButton: Locator;
  readonly relatedHeading: Locator;
  readonly shareButton: Locator;
  readonly shareDialog: Locator;
  /** Cards of the Related block: the only `/wallpapers/<GUID>` links on a detail page. */
  readonly related: CardGrid;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main');
    this.title = main.getByRole('heading', { level: 1 });
    this.artist = main.locator('a[href^="/profiles/"]').first();
    this.downloadsText = main.getByText(/\d+\s+Downloads/);
    this.keywordChips = main.locator('a[href^="/wallpapers?keyword="]');
    this.previewImage = main.locator('img.object-cover').first();
    this.premiumLabel = main.getByText('Premium', { exact: true });
    this.buyButton = main.getByRole('button', { name: /^Buy for/ });
    this.downloadButton = main.getByRole('button', { name: 'Download', exact: true });
    // Two Share buttons are in the DOM; only one is visible at a time.
    this.shareButton = main.locator('button[data-event="SHARE_CONTENT"]:visible').first();
    this.shareDialog = page.getByRole('dialog').filter({ hasText: 'Share item' });
    this.relatedHeading = main.getByRole('heading', { name: 'Related', exact: true });
    this.related = new CardGrid(page, '/wallpapers');
  }

  /** A direct load of an item (not a click from the list). */
  async open(href: string) {
    await this.page.goto(href);
    await expect(this.title).toBeVisible();
    await dismissCookieBanner(this.page);
  }

  async validateOpened(href: string, title: string) {
    await expect(this.page).toHaveURL(url => url.pathname === href);
    await expect(this.title).toHaveText(title);
    await expect(this.page).toHaveTitle(new RegExp(`${escapeRegExp(title)} wallpaper by `, 'i'));
  }

  async validateDetails() {
    await expect(this.artist).toBeVisible();
    await expect(this.downloadsText).toBeVisible();
    await expect(this.keywordChips.first()).toBeVisible();
  }

  async validatePreviewLoaded() {
    await expect(this.previewImage).toBeVisible();
    await expect
      .poll(() => this.previewImage.evaluate(image => (image as HTMLImageElement).naturalWidth), { timeout: LOAD_TIMEOUT })
      .toBeGreaterThan(0);
  }

  async validateFree() {
    await expect(this.downloadButton).toHaveCount(1);
    await expect(this.downloadButton).toBeVisible();
    await expect(this.premiumLabel).toBeHidden();
    await expect(this.buyButton).toBeHidden();
  }

  /** "Premium" and "Buy for Ƶ<price>" with the same price, and no Download button. */
  async validatePremiumPrice(price: number) {
    await expect(this.premiumLabel).toBeVisible();
    await expect(this.buyButton).toHaveText(new RegExp(`^Buy for\\s*Ƶ\\s*${price}$`));
    await expect(this.downloadButton).toBeHidden();
  }

  async clickBuy() {
    await this.buyButton.click();
  }

  async openShare() {
    await this.shareButton.click();
  }

  async closeShare() {
    await this.page.keyboard.press('Escape');
  }

  async validateShareOpened(pathname: string) {
    await expect(this.shareDialog).toBeVisible();
    await expect(this.shareDialog.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(this.page).toHaveURL(url => url.pathname === pathname);
  }

  async validateShareClosed(pathname: string) {
    await expect(this.shareDialog).toBeHidden();
    await expect(this.page).toHaveURL(url => url.pathname === pathname);
  }

  async firstKeyword(): Promise<string> {
    await expect(this.keywordChips.first()).toBeVisible();
    return (await this.keywordChips.first().innerText()).trim();
  }

  async openFirstKeyword() {
    await this.keywordChips.first().click();
  }

  /** Related renders lazily; scroll in rounds until its heading is in view. */
  async scrollToRelated() {
    await expect
      .poll(
        async () => {
          await this.page.mouse.wheel(0, 800);
          return this.relatedHeading.isVisible();
        },
        { intervals: [500], timeout: LOAD_TIMEOUT }
      )
      .toBe(true);
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
