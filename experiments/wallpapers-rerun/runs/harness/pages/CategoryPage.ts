import { expect, Locator, Page } from '@playwright/test';
import { CardGrid } from './CardGrid';
import { FiltersBar } from './FiltersBar';
import { FilterDrawer } from './FilterDrawer';
import { MainHeaderPage } from './MainHeaderPage';

/** A `/category/<area>/<slug>` page: H1, sub-category chips and a card grid, without the filter bar. */
export class CategoryPage {
  readonly mainHeader: MainHeaderPage;
  readonly filtersBar: FiltersBar;
  readonly cards: CardGrid;
  readonly subCategoryChips: Locator;

  constructor(
    private readonly page: Page,
    hrefPrefix: string,
    categoryHrefPrefix: string
  ) {
    this.mainHeader = new MainHeaderPage(page);
    this.filtersBar = new FiltersBar(page, new FilterDrawer(page));
    this.cards = new CardGrid(page, hrefPrefix);
    this.subCategoryChips = page.getByRole('main').locator(`a[href^="${categoryHrefPrefix}/"]`);
  }

  async validateUrl(pathname: string) {
    await expect(this.page).toHaveURL(url => url.pathname === pathname && url.search === '');
  }

  async validateTitle(expected: RegExp) {
    await expect(this.page).toHaveTitle(expected);
  }

  async validateSubCategoryChips() {
    await expect(this.subCategoryChips.first()).toBeVisible();
  }
}
