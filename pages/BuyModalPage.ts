import { expect, Locator, Page } from '@playwright/test';
import { locals } from '../src/utils/locals';

export class ModalBuyPage {
  readonly modal: Locator;
  readonly headerCloseBtn: Locator;
  readonly title: Locator;
  readonly cancelBtn: Locator;
  readonly buyCreditsBtn: Locator;

  constructor(readonly page: Page) {
    this.modal = this.page.locator('div[class*="Modal_modal"]').nth(1);
    this.headerCloseBtn = this.modal.locator('button').first();
    this.title = this.modal.locator('h2');
    this.cancelBtn = this.modal.locator('button', { hasText: 'Cancel' });
    this.buyCreditsBtn = this.modal.locator('button', { hasText: 'Buy Credits' });
  }

  async validateModalDialog(value?: string | number) {
    await expect(this.headerCloseBtn).toBeEnabled();
    if (value) {
      await expect(this.title).toHaveText(locals.MODAL_BUY_TITLE.replace('{value}', value.toString()));
    } else {
      const expectedTitle = locals.MODAL_BUY_TITLE.replace(/{value}/, '.*'); // Use '.*' to match the dynamic part
      await expect(this.title).toHaveText(new RegExp(expectedTitle));
    }
    await expect(this.cancelBtn).toBeEnabled();
    await expect(this.buyCreditsBtn).toBeEnabled();
  }

  async clickClose() {
    await this.headerCloseBtn.click();
    await expect(this.headerCloseBtn).not.toBeAttached();
  }
}
