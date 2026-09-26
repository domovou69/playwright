import { Locator, Page } from '@playwright/test';

export class WallpaperDetailPage {
  readonly downloads: Locator;
  readonly buyBtn: Locator;
  readonly downloadBtn: Locator;
  readonly premiumBadge: Locator;

  constructor(readonly page: Page) {
    this.downloads = this.page.locator('p', { hasText: 'Downloads' });
    this.buyBtn = this.page.locator('button', { hasText: 'Buy for Ƶ' }).nth(1);
    this.downloadBtn = this.page.getByRole('button', { name: 'Download' });
    this.premiumBadge = this.page.getByText('Premium', { exact: true });
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
