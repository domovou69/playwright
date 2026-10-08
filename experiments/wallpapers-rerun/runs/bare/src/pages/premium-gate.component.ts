import { Locator, Page } from '@playwright/test';

/** Dialog a guest gets when pressing Download on a premium wallpaper. */
export class PremiumGate {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly loginAndWatchAd: Locator;
  readonly buyCredits: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Unlock and Support the Artist' });
    this.title = this.dialog.getByText('Unlock and Support the Artist');
    this.loginAndWatchAd = this.dialog.getByRole('button', {
      name: 'Login & Watch Ad',
    });
    this.buyCredits = this.dialog.getByRole('button', { name: 'Buy Credits' });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close' });
  }
}
