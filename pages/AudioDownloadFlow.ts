import { expect, Locator, Page } from '@playwright/test';
import { stat } from 'fs/promises';

// A free audio download (ringtone or notification sound): the "Preparing your download" countdown dialog, then a real .mp3. The countdown length varies, so
// the wait for the download event is long and the number is never asserted.
export class AudioDownloadFlow {
  readonly downloadBtn: Locator;
  readonly preparingDialog: Locator;
  readonly unlockDialog: Locator;

  // The dialogs have no accessible name (the site logs a missing DialogTitle), so they are found by their text.
  constructor(private readonly page: Page) {
    this.downloadBtn = page.getByRole('button', { name: 'Download', exact: true });
    this.preparingDialog = page.getByRole('dialog').filter({ hasText: 'Preparing your download' });
    this.unlockDialog = page.getByRole('dialog').filter({ hasText: 'Unlock and Support the Artist' });
  }

  // Returns the saved file path.
  async downloadFree(savePath: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 40_000 });
    await this.downloadBtn.click();
    await expect(this.preparingDialog).toBeVisible();
    await expect(this.preparingDialog).toContainText('Please wait a few moments for the download to begin');
    await expect(this.unlockDialog).not.toBeAttached();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.mp3$/);
    await download.saveAs(savePath);
    expect((await stat(savePath)).size).toBeGreaterThan(0);
    await expect(this.preparingDialog).not.toBeAttached();
    return savePath;
  }
}
