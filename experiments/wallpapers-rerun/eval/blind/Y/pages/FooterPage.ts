import { expect, Locator, Page } from '@playwright/test';

export class FooterPage {
  readonly root: Locator;
  readonly wallpapersLink: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('contentinfo');
    this.wallpapersLink = this.root.getByRole('link', { name: 'Wallpapers', exact: true });
  }

  async validateVisible() {
    await expect(this.root).toBeAttached();
    await expect(this.wallpapersLink).toBeAttached();
  }
}
