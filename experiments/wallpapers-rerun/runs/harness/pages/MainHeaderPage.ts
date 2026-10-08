import { expect, Locator, Page } from '@playwright/test';

/** The page's main H1 (case-insensitive: the DOM text is capitalised by CSS). */
export class MainHeaderPage {
  readonly heading: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('main').getByRole('heading', { level: 1 });
  }

  async validateHeading(expected: RegExp) {
    await expect(this.heading).toHaveText(expected);
  }
}
