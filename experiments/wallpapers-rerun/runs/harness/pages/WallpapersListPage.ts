import { expect, Page } from '@playwright/test';
import { dismissCookieBanner } from '../src/utils/helper';
import { CardGrid } from './CardGrid';
import { DownloadFlow } from './DownloadFlow';
import { ExploreCategories } from './ExploreCategories';
import { FilterDrawer } from './FilterDrawer';
import { FiltersBar } from './FiltersBar';
import { FooterPage } from './FooterPage';
import { HeaderPage } from './HeaderPage';
import { MainHeaderPage } from './MainHeaderPage';

export class WallpapersListPage {
  readonly header: HeaderPage;
  readonly footer: FooterPage;
  readonly mainHeader: MainHeaderPage;
  readonly filtersBar: FiltersBar;
  readonly filterDrawer: FilterDrawer;
  readonly exploreCategories: ExploreCategories;
  readonly cards: CardGrid;
  readonly downloadFlow: DownloadFlow;

  constructor(private readonly page: Page) {
    this.header = new HeaderPage(page);
    this.footer = new FooterPage(page);
    this.mainHeader = new MainHeaderPage(page);
    this.filterDrawer = new FilterDrawer(page);
    this.filtersBar = new FiltersBar(page, this.filterDrawer);
    this.exploreCategories = new ExploreCategories(page, 'wallpaper', '/category/wallpapers');
    this.cards = new CardGrid(page, '/wallpapers');
    this.downloadFlow = new DownloadFlow(page);
  }

  async open(path = '/wallpapers') {
    await this.page.goto(path);
    await expect(this.mainHeader.heading).toHaveText(/download hd phone wallpapers for free/i);
    await dismissCookieBanner(this.page);
  }

  async validateUrl(pathname: string, params: Record<string, string> = {}) {
    await expect(this.page).toHaveURL(
      url => url.pathname === pathname && Object.entries(params).every(([key, value]) => url.searchParams.get(key) === value)
    );
  }

  /** The path is `pathname` and none of the listed query params is present. */
  async validateUrlWithoutParams(pathname: string, names: string[]) {
    await expect(this.page).toHaveURL(url => url.pathname === pathname && names.every(name => !url.searchParams.has(name)));
  }

  /** A keyword search result: URL param, the term kept in the search input and an H1 that starts with it. */
  async validateKeywordSearch(term: string) {
    await this.validateUrl('/wallpapers', { keyword: term });
    await expect(this.header.searchInput).toHaveValue(term);
    await expect(this.mainHeader.heading).toHaveText(new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
  }

  async validateNoResults() {
    await expect(this.page.getByRole('heading', { name: /couldn.?t find anything/i })).toBeVisible();
    await this.cards.validateNone();
  }
}
