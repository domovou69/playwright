import { expect, Locator, Page } from '@playwright/test';
import type { WallpapersListPage } from './WallpapersListPage';
import { commitRangeValue } from './RangeInput';
import { ColorOptionType, PriceOptionType, SortByType, TagsOptionType, WallpaperCategoryType } from '../src/types/types';

// The inline filter bar above the cards (desktop layout). The narrow layout uses FilterDrawer instead.
export class FiltersBar {
  readonly filterCategory: Locator;
  readonly filterTag: Locator;
  readonly filterPrice: Locator;
  readonly filterColor: Locator;
  readonly filterSortBy: Locator;
  readonly resetAllBtn: Locator;
  readonly categoryFilterDialog: Locator;
  readonly colorFilterDialog: Locator;
  readonly priceFilterDialog: Locator;
  readonly sortByFilterDialog: Locator;

  constructor(
    private readonly page: Page,
    private readonly list: WallpapersListPage
  ) {
    const main = list.main;
    // Exact-match regexes: once a filter is active, its applied-value chip (e.g. "Price: High to Low"
    // from Sort by) sits in the same `main button` pool and a substring hasText match picks up both.
    this.filterCategory = main.locator('button', { hasText: /^Category$/ });
    this.filterTag = main.locator('button', { hasText: /^Tag$/ });
    this.filterPrice = main.locator('button', { hasText: /^Price$/ });
    this.filterColor = main.locator('button', { hasText: /^Color$/ });
    this.filterSortBy = main.locator('button', { hasText: /^Sort by$/ });
    this.resetAllBtn = main.locator('button', { hasText: 'Reset All' });
    this.categoryFilterDialog = page.getByRole('dialog', { name: 'Category' });
    this.colorFilterDialog = page.getByRole('dialog', { name: 'Color' });
    this.priceFilterDialog = page.getByRole('dialog', { name: 'Price' });
    this.sortByFilterDialog = page.getByRole('dialog', { name: 'Sort by' });
  }

  // Closes whichever filter dropdown or drawer is open. Clicking the chip again does not work: the page behind an open
  // dropdown is inert and its popup covers the chip. Escape closes the topmost layer.
  async closeFilter() {
    await this.page.keyboard.press('Escape');
    await expect(this.page.getByRole('dialog')).not.toBeAttached();
  }

  async waitForFilterToBeApplied(filterName: string) {
    const appliedFilterBtn = this.page.locator('button', { hasText: new RegExp(filterName, 'i') });
    await appliedFilterBtn.waitFor({ state: 'visible' });
  }

  async filterByCategories(categoryOptions: WallpaperCategoryType[]) {
    await this.filterCategory.click();
    await expect(this.categoryFilterDialog).toBeVisible();

    // Select all options
    for (const categoryOption of categoryOptions) {
      const categoryLabel = this.categoryFilterDialog.getByRole('option', { name: categoryOption });
      await categoryLabel.scrollIntoViewIfNeeded();
      await categoryLabel.click();
      await this.waitForFilterToBeApplied(categoryOption);
    }

    // Close filter
    await this.closeFilter();
  }

  async isCategorySelected(category: WallpaperCategoryType): Promise<boolean> {
    await this.filterCategory.click();
    await expect(this.categoryFilterDialog).toBeVisible();
    const isSelected = (await this.categoryFilterDialog.getByRole('option', { name: category }).getAttribute('aria-checked')) === 'true';
    await this.closeFilter();
    return isSelected;
  }

  async filterByColor(colors: ColorOptionType[]) {
    await this.filterColor.click();
    await expect(this.colorFilterDialog).toBeVisible();

    // Select all options
    for (const color of colors) {
      const colorLabel = this.colorFilterDialog.getByRole('option', { name: color });
      await colorLabel.scrollIntoViewIfNeeded();
      await colorLabel.click();
      await this.waitForFilterToBeApplied(color);
    }

    // Close filter
    await this.closeFilter();
  }

  async isColorSelected(color: ColorOptionType): Promise<boolean> {
    await this.filterColor.click();
    await expect(this.colorFilterDialog).toBeVisible();
    const isSelected = (await this.colorFilterDialog.getByRole('option', { name: color }).getAttribute('aria-checked')) === 'true';
    await this.closeFilter();
    return isSelected;
  }

  async filterByTag(tags: TagsOptionType[]) {
    await this.filterTag.click();
    const tagDialog = this.page.getByRole('dialog');
    await expect(tagDialog).toBeVisible();

    // Select all options
    for (const tag of tags) {
      const tagLabel = tagDialog.getByRole('option', { name: tag, exact: true });
      await tagLabel.scrollIntoViewIfNeeded();
      await tagLabel.click();
      await this.waitForFilterToBeApplied(tag);
    }

    // Close filter
    await this.closeFilter();
  }

  async filterByPrice(prices: PriceOptionType[]) {
    await this.filterPrice.click();
    await expect(this.priceFilterDialog).toBeVisible();

    // Select all options
    for (const price of prices) {
      const priceLabel = this.priceFilterDialog.getByRole('option', { name: price });
      await priceLabel.scrollIntoViewIfNeeded();
      await priceLabel.click();
      await this.waitForFilterToBeApplied(price);
    }

    // Close filter
    await this.closeFilter();
  }

  async setPriceRange(from: number, to: number) {
    await this.filterPrice.click();
    await expect(this.priceFilterDialog).toBeVisible();

    // From/To are numeric inputs, not the Free/Paid checkbox options filterByPrice handles above.
    await commitRangeValue(this.priceFilterDialog.getByRole('menuitem', { name: 'From' }), from, 'minPrice');
    await commitRangeValue(this.priceFilterDialog.getByRole('menuitem', { name: 'To' }), to, 'maxPrice');

    // Close filter
    await this.closeFilter();
  }

  async filterBySortBy(option: SortByType) {
    const hrefsBefore = await this.list.getCardsHref();
    await this.filterSortBy.click();
    await expect(this.sortByFilterDialog).toBeVisible();
    const sortByLabel = this.sortByFilterDialog.getByRole('menuitemradio', { name: option });
    await sortByLabel.scrollIntoViewIfNeeded();
    await sortByLabel.click();
    await expect(this.sortByFilterDialog).not.toBeAttached();
    await this.list.waitForCardsToUpdate(hrefsBefore);
  }

  async isSortBySelected(option: SortByType): Promise<boolean> {
    await this.filterSortBy.click();
    await expect(this.sortByFilterDialog).toBeVisible();
    const isSelected = (await this.sortByFilterDialog.getByRole('menuitemradio', { name: option }).getAttribute('aria-checked')) === 'true';
    await this.closeFilter();
    return isSelected;
  }

  async getPriceFromValue(): Promise<string> {
    await this.filterPrice.click();
    await expect(this.priceFilterDialog).toBeVisible();
    const value = await this.priceFilterDialog.getByRole('menuitem', { name: 'From' }).inputValue();
    await this.closeFilter();
    return value;
  }

  async clickResetAll() {
    const button = this.resetAllBtn;
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const parent = this.resetAllBtn.locator('..');
    await parent.locator(':nth-child(2)').waitFor({ state: 'detached', timeout: 10000 });
  }
}
