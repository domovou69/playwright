import { readFile } from 'fs/promises';
import { expect, Locator, Page } from '@playwright/test';

// The countdown is about 17 s and the file arrives right after it.
const DOWNLOAD_TIMEOUT = 45_000;

/** The free download: the "Preparing your download" countdown dialog and the file it delivers. */
export class DownloadFlow {
  readonly dialog: Locator;
  readonly waitMessage: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Preparing your download' });
    this.waitMessage = this.dialog.getByText('Please wait a few moments for the download to begin');
  }

  /** The countdown value, "Downloads left today" and "Get the App" depend on an A/B variant and are not asserted. */
  async download(trigger: Locator, savePath: string) {
    const downloading = this.page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT });
    await trigger.click();
    await expect(this.dialog).toBeVisible();
    await expect(this.waitMessage).toBeVisible();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/\.jpg$/i);
    await download.saveAs(savePath);
    await this.validateJpeg(savePath);
  }

  async validateJpeg(path: string) {
    const bytes = await readFile(path);
    expect(bytes.length).toBeGreaterThan(0);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  }

  async validateClosed() {
    await expect(this.dialog).toBeHidden();
  }
}
