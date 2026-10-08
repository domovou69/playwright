import { Locator, Page } from '@playwright/test';

export class WallpaperDetailPage {
  readonly downloads: Locator;
  readonly buyBtn: Locator;
  readonly downloadBtn: Locator;
  readonly premiumBadge: Locator;
  readonly artistLink: Locator;
  readonly tagChips: Locator;
  readonly relatedHeading: Locator;
  // Reuses the same CardsContainer/A_link markup as WallpapersListPage.cardsContainer/cardsAll.
  readonly relatedCards: Locator;

  constructor(readonly page: Page) {
    // A page-wide "500M+ Downloads" marketing stat also matches a plain `p:has-text("Downloads")` -
    // scope to the H1's own info container to get just this wallpaper's count. Not `h1 + p`: a
    // "Premium" badge div sometimes sits directly after the H1 (a free wallpaper can still carry that
    // badge), pushing the downloads paragraph further down within the same container.
    this.downloads = this.page.locator('h1').locator('..').locator('p', { hasText: 'Downloads' });
    this.buyBtn = this.page.locator('button', { hasText: 'Buy for Ƶ' }).nth(1);
    this.downloadBtn = this.page.getByRole('button', { name: 'Download' });
    this.premiumBadge = this.page.getByText('Premium', { exact: true });
    this.artistLink = this.page.locator('a[href^="/profiles/"]');
    this.tagChips = this.page.locator('a[href^="/wallpapers?keyword="]');
    this.relatedHeading = this.page.getByRole('heading', { name: 'Related' });
    this.relatedCards = this.page.locator('div[class*="CardsContainer"]').last().locator(':scope > a[class*="A_link"]');
  }

  priceText(price: string): Locator {
    // Same mobile/desktop duplicate rendering as buyBtn: two price badges exist, the last is the visible one on desktop
    return this.page.getByText(price, { exact: true }).last();
  }

  async clickBuy() {
    await this.buyBtn.waitFor({ state: 'visible' });
    await this.buyBtn.hover();
    await this.buyBtn.click();
  }

  async clickDownload() {
    await this.downloadBtn.click();
  }

  async saveFreeWallpaper(folder: string, name: string) {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
    await this.clickDownload();
    const download = await downloadPromise;
    const downloadPath = `downloads/${folder}/${name}.jpg`;
    await download.saveAs(downloadPath);
  }
}
