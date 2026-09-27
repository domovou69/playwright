import { expect, Locator, Page } from '@playwright/test';
import { locals } from '../src/utils/locals';

export class ModalBuyPage {
  readonly modal: Locator;
  readonly headerCloseBtn: Locator;
  readonly title: Locator;
  readonly buyCreditsBtn: Locator;
  readonly artistName: Locator;
  readonly loginWatchAdBtn: Locator;
  // Paid-purchase modal ("Buy for Ƶ<price>"), distinct from the free-download "Unlock and Support the Artist" modal above
  readonly creditsPackageBtn: Locator;
  readonly loginLink: Locator;
  readonly cancelBtn: Locator;

  constructor(readonly page: Page) {
    this.modal = this.page.locator('div[class*="Modal_modal"]').nth(1);
    this.headerCloseBtn = this.modal.getByRole('button', { name: 'Close' });
    this.title = this.modal.locator('div.heading-xl');
    this.buyCreditsBtn = this.modal.locator('button', { hasText: 'Buy Credits' });
    this.artistName = this.modal.locator('span.body-lg');
    this.loginWatchAdBtn = this.modal.getByRole('button', { name: 'Login & Watch Ad' });
    this.creditsPackageBtn = this.modal.getByRole('button', { name: /\$\s?\d/ }).first();
    this.loginLink = this.modal.getByRole('link', { name: 'Log in' });
    this.cancelBtn = this.modal.getByRole('button', { name: 'Cancel' });
  }

  async validateModalDialog(artist?: string) {
    await expect(this.headerCloseBtn).toBeEnabled();
    await expect(this.title).toHaveText(locals.MODAL_BUY_TITLE);
    if (artist) await expect(this.artistName).toHaveText(artist);
    await expect(this.loginWatchAdBtn).toBeVisible();
    await expect(this.buyCreditsBtn).toBeEnabled();
  }

  async clickClose() {
    await this.headerCloseBtn.click();
    await expect(this.headerCloseBtn).not.toBeAttached();
  }

  purchaseTitle(price: string): Locator {
    return this.modal.getByRole('heading', { name: `To buy this item you need ${price} Zedge Credits` });
  }

  async validatePurchaseModalDialog(price: string) {
    await expect(this.purchaseTitle(price)).toBeVisible();
    await expect(this.creditsPackageBtn).toBeVisible();
    await expect(this.loginLink).toBeVisible();
    await expect(this.cancelBtn).toBeVisible();
    await expect(this.buyCreditsBtn).toBeVisible();
  }

  async clickCancel() {
    await this.cancelBtn.click();
    await expect(this.cancelBtn).not.toBeAttached();
  }
}
