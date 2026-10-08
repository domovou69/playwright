import { expect, Locator, Page } from '@playwright/test';

/** The two guest purchase gates: "To buy this item you need N Zedge Credits" and "Unlock and Support the Artist". */
export class BuyModalPage {
  readonly dialog: Locator;
  readonly loginLink: Locator;
  readonly cancelButton: Locator;
  readonly buyCreditsButton: Locator;
  readonly unlockDialog: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.loginLink = this.dialog.getByRole('link', { name: 'Log in' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.buyCreditsButton = this.dialog.getByRole('button', { name: 'Buy Credits' });
    this.unlockDialog = page.getByRole('dialog').filter({ hasText: 'Unlock and Support the Artist' });
  }

  /** Both ways of closing the gate; Escape is the same as for the filter dropdowns. */
  async close(how: 'cancel' | 'escape') {
    const closers = {
      cancel: () => this.cancelButton.click(),
      escape: () => this.page.keyboard.press('Escape'),
    };
    await closers[how]();
  }

  async validateBuyPrompt(price: number) {
    await expect(this.dialog).toContainText(`To buy this item you need ${price} Zedge Credits`);
    await expect(this.loginLink).toBeVisible();
    await expect(this.cancelButton).toBeVisible();
    await expect(this.buyCreditsButton).toBeVisible();
  }

  async validateClosed() {
    await expect(this.dialog).toBeHidden();
  }

  async validateUnlockAbsent() {
    await expect(this.unlockDialog).toBeHidden();
  }
}
