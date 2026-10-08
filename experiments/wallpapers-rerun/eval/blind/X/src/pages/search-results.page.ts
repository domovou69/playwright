import { Locator, Page } from '@playwright/test';
import { dismissCookieBanner, waitForHydration } from '../utils/helper';
import { Header } from './header.component';

/** /find/<term> - cross-content search page (wallpapers, ringtones...) with a "View all" link per type. */
export class SearchResultsPage {
  readonly header: Header;
  readonly wallpapersViewAll: Locator;
  readonly wallpaperResults: Locator;
  readonly notFoundHeading: Locator;
  readonly suggestions: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.wallpapersViewAll = page.getByRole('link', {
      name: /^Wallpapers View all/,
    });
    this.wallpaperResults = page.locator('main a[href^="/wallpapers/"]');
    this.notFoundHeading = page.getByRole('heading', {
      name: /couldn’t find it/,
    });
    this.suggestions = page.getByRole('main').locator('a[href^="/wallpapers?keyword="]');
  }

  async goto(term: string) {
    await this.page.goto(`/find/${encodeURIComponent(term)}`, {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookieBanner(this.page, 3000);
    await waitForHydration(this.page);
  }
}
