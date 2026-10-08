import { expect, Locator, Page } from '@playwright/test';

/** The "Explore different <area> categories" block of a list page: groups with links to `/category/<area>/<slug>` pages. */
export class ExploreCategories {
  readonly heading: Locator;
  readonly links: Locator;
  private readonly block: Locator;

  constructor(page: Page, areaSingular: string, categoryHrefPrefix: string) {
    this.heading = page.getByRole('heading', { level: 2, name: `Explore different ${areaSingular} categories` });
    this.block = this.heading.locator('xpath=..');
    this.links = this.block.locator(`a[href^="${categoryHrefPrefix}/"]`);
  }

  async scrollIntoView() {
    await this.heading.scrollIntoViewIfNeeded();
  }

  async validateVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.links.first()).toBeVisible();
  }

  async openCategory(name: string) {
    await this.block.getByRole('link', { name, exact: true }).click();
  }
}
