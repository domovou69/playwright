import { Download, expect, Locator, Page } from '@playwright/test';
import { dismissCookieBanner, waitForHydration } from '../utils/helper';
import { Header } from './header.component';
import { PremiumGate } from './premium-gate.component';

/** /wallpapers/<uuid> */
export class WallpaperDetailPage {
  readonly header: Header;
  readonly gate: PremiumGate;
  readonly preparingDialog: Locator;
  readonly title: Locator;
  readonly author: Locator;
  readonly downloadsCount: Locator;
  readonly premiumLabel: Locator;
  readonly keywordLinks: Locator;
  readonly downloadButton: Locator;
  readonly dateLabel: Locator;
  readonly mainImage: Locator;
  readonly relatedHeading: Locator;
  readonly relatedCards: Locator;

  constructor(private readonly page: Page) {
    const main = page.getByRole('main');
    this.header = new Header(page);
    this.gate = new PremiumGate(page);
    this.preparingDialog = page.getByRole('dialog').filter({ hasText: 'Preparing your download' });
    this.title = main.getByRole('heading', { level: 1 });
    this.author = main
      .getByRole('link')
      .filter({ hasNot: page.locator('[href^="/wallpapers"]') })
      .first();
    this.downloadsCount = main.getByText(/Downloads$/);
    this.premiumLabel = main.getByText(/^Premium/);
    this.keywordLinks = main.locator('a[href^="/wallpapers?keyword="]');
    this.downloadButton = main.getByRole('button', { name: 'Download', exact: true }).first();
    this.dateLabel = main.getByText(/^\d{4} [A-Z][a-z]{2} \d{1,2}$/).first();
    this.mainImage = main.locator('img[src*="image-server"]').first();
    this.relatedHeading = main.getByRole('heading', { name: 'Related' });
    this.relatedCards = main.locator('a[href^="/wallpapers/"]');
  }

  async goto(pathOrId: string) {
    const path = pathOrId.startsWith('/') ? pathOrId : `/wallpapers/${pathOrId}`;
    const response = await this.page.goto(path, {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookieBanner(this.page, 3000);
    await waitForHydration(this.page);
    return response;
  }

  /**
   * Presses Download and returns the file. A guest first gets a "Preparing your download" countdown (~15 s)
   * and the file arrives when it ends. An early click (before hydration) is swallowed, so click again until
   * the countdown dialog shows up.
   */
  async download(): Promise<Download> {
    const pending = this.page.waitForEvent('download', { timeout: 60_000 });
    pending.catch(() => undefined);
    await expect(async () => {
      if (!(await this.preparingDialog.isVisible())) await this.downloadButton.click({ timeout: 3000 });
      await expect(this.preparingDialog).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30_000 });
    return pending;
  }

  /** Presses Download on a premium item until the unlock dialog shows (early clicks are swallowed before hydration). */
  async openGate() {
    await expect(async () => {
      if (!(await this.gate.dialog.isVisible())) await this.downloadButton.click({ timeout: 3000 });
      await expect(this.gate.dialog).toBeVisible({ timeout: 3000 });
    }).toPass();
  }

  /** After a download the page shows a "Preparing your download" countdown dialog that blocks the page until it ends. */
  async waitForDownloadDialogToClose() {
    await expect(this.page.getByRole('dialog').filter({ hasText: 'Preparing your download' })).toBeHidden({
      timeout: 40_000,
    });
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible();
    await expect(this.downloadButton).toBeVisible();
  }
}
