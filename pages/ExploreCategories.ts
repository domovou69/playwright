import { Locator, Page } from '@playwright/test';

// "Explore different <area> categories" block at the bottom of a list (outside <main>) and the sub-filter chip row that the
// /category/<area>/<slug> pages show after the H1 (inside <main>). Shared by wallpapers and ringtones.
export class ExploreCategories {
  readonly heading: Locator;
  readonly subFilterLinks: Locator;

  constructor(
    private readonly page: Page,
    main: Locator,
    area: 'wallpaper' | 'ringtone'
  ) {
    this.heading = page.getByRole('heading', { name: `Explore different ${area} categories` });
    this.subFilterLinks = main.locator('h1 + div a');
  }

  link(category: string): Locator {
    return this.heading.locator('..').getByRole('link', { name: category, exact: true });
  }

  // Picks a chip that is not a link back to the current page: the current category's own chip can appear anywhere in the row.
  async selectDifferentSubFilter() {
    const currentPath = new URL(this.page.url()).pathname;
    const firstHref = await this.subFilterLinks.first().getAttribute('href');
    const link = firstHref === currentPath ? this.subFilterLinks.nth(1) : this.subFilterLinks.first();
    await link.click();
  }
}
