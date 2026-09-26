import { expect, Locator, Page } from '@playwright/test';
import { locals } from '../src/utils/locals';

export class ModalBuyPage {
  readonly modal: Locator;
  readonly headerCloseBtn: Locator;
  readonly title: Locator;
  readonly buyCreditsBtn: Locator;
  readonly artistName: Locator;

  constructor(readonly page: Page) {
    this.modal = this.page.locator('div[class*="Modal_modal"]').nth(1);
    this.headerCloseBtn = this.modal.getByRole('button', { name: 'Close' });
    this.title = this.modal.locator('div.heading-xl');
    this.buyCreditsBtn = this.modal.locator('button', { hasText: 'Buy Credits' });
    this.artistName = this.modal.locator('span.body-lg');
  }

  async validateModalDialog(artist?: string) {
    await expect(this.headerCloseBtn).toBeEnabled();
    await expect(this.title).toHaveText(locals.MODAL_BUY_TITLE);
    if (artist) await expect(this.artistName).toHaveText(artist);
    await expect(this.buyCreditsBtn).toBeEnabled();
  }

  async clickClose() {
    await this.headerCloseBtn.click();
    await expect(this.headerCloseBtn).not.toBeAttached();
  }
}
