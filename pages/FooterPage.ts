import { Locator, Page } from '@playwright/test';

export class FooterPage {
  readonly footer: Locator;
  readonly footerLinks: Locator;

  constructor(readonly page: Page) {
    this.footer = this.page.locator('footer');
    this.footerLinks = this.footer.locator('a');
  }
}
