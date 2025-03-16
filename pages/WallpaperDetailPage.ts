import { Locator, Page } from '@playwright/test';

export class WallpaperDetailPage {
  readonly downloads: Locator;
  readonly buyBtn: Locator;
  readonly downloadBtn: Locator;

  constructor(readonly page: Page) {
    this.downloads = this.page.locator('p', { hasText: 'Downloads' });
    this.buyBtn = this.page.locator('button', { hasText: 'Buy for Ƶ' }).nth(1);
    this.downloadBtn = this.page.getByRole('button', { name: 'Download' });
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
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickDownload();
    const download = await downloadPromise;
    const downloadPath = `downloads/${folder}/${name}.jpg`;
    await download.saveAs(downloadPath);
  }
}
