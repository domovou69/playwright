import { Locator, Page } from '@playwright/test';
import { WallpaperFeedPage } from './wallpaper-feed.page';

/** /category/wallpapers/<slug> - SEO category landing page, same grid as the main feed. */
export class CategoryPage extends WallpaperFeedPage {
  readonly relatedTags: Locator;

  constructor(page: Page) {
    super(page);
    this.relatedTags = page
      .getByRole('main')
      .getByRole('link')
      .filter({ has: page.getByRole('button') });
  }

  async open(slug: string) {
    return this.goto(`/category/wallpapers/${slug}`);
  }
}
