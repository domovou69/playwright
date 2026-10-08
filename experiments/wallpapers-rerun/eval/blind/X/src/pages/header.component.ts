import { expect, Locator, Page } from '@playwright/test';

/** Site-wide top navigation: search box and sign-in entry. */
export class Header {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    const nav = page.getByRole('navigation').first();
    this.searchInput = nav.getByRole('textbox', { name: 'Search Zedge' });
    this.searchButton = nav.getByRole('button', {
      name: 'Search',
      exact: true,
    });
    this.signInButton = nav.getByRole('button', { name: 'Sign in' });
  }

  async search(term: string) {
    // Before hydration the box is a plain GET form that ignores our route (/wallpapers?search=...), so wait.
    await expect
      .poll(() => this.searchInput.evaluate(el => Object.keys(el).some(k => k.startsWith('__reactProps'))))
      .toBe(true);
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }
}
