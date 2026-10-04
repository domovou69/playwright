import { expect, Locator } from '@playwright/test';
import type { RingtonesListPage } from './RingtonesListPage';
import { commitRangeValue } from '../RangeInput';
import { PriceOptionType, SortByType } from '../../src/types/types';

const FILTER_PARAMS = ['categories', 'tags', 'free', 'paid', 'minPrice', 'maxPrice', 'minDuration', 'maxDuration', 'sort'];

// The inline filter bar above the ringtone cards. Same shape as the wallpapers FiltersBar, but with Duration instead of
// Color and Tag as a combobox.
export class RingtonesFiltersBar {
  readonly labelChip: Locator;
  readonly filterCategory: Locator;
  readonly filterTag: Locator;
  readonly filterPrice: Locator;
  readonly filterDuration: Locator;
  readonly filterSortBy: Locator;
  readonly resetAllBtn: Locator;
  readonly categoryDialog: Locator;
  readonly tagDialog: Locator;
  readonly priceDialog: Locator;
  readonly durationDialog: Locator;
  readonly sortByDialog: Locator;

  constructor(private readonly list: RingtonesListPage) {
    const main = list.main;
    const page = list.page;
    // Exact-match regexes: an applied-value chip sits in the same `main button` pool as the filter button.
    this.labelChip = main.getByText('Ringtones', { exact: true }).first();
    this.filterCategory = main.locator('button', { hasText: /^Category$/ });
    this.filterTag = main.getByRole('combobox').filter({ hasText: /^Tag$/ });
    this.filterPrice = main.locator('button', { hasText: /^Price$/ });
    this.filterDuration = main.locator('button', { hasText: /^Duration$/ });
    this.filterSortBy = main.locator('button', { hasText: /^Sort by$/ });
    this.resetAllBtn = main.locator('button', { hasText: 'Reset All' });
    this.categoryDialog = page.getByRole('dialog', { name: 'Category' });
    // The Tag dialog has no accessible name: a search box with the contextual options below it.
    this.tagDialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: 'Search' }) });
    this.priceDialog = page.getByRole('dialog', { name: 'Price' });
    this.durationDialog = page.getByRole('dialog', { name: 'Duration' });
    this.sortByDialog = page.getByRole('dialog', { name: 'Sort by' });
  }

  // An applied value shows as a chip next to "Reset All" (a button for some filters, plain text for a category).
  chip(text: string): Locator {
    return this.list.main.getByText(text, { exact: true }).first();
  }

  // Closes whichever dropdown is open. Clicking the chip again does not work: the page behind an open dropdown is inert.
  async closeFilter() {
    await this.list.page.keyboard.press('Escape');
    await expect(this.list.page.getByRole('dialog')).not.toBeAttached();
  }

  // Every filter is shown; "Reset All" appears only once a filter is applied, so the expectation is a parameter.
  async validateVisible({ resetAll = false }: { resetAll?: boolean } = {}) {
    for (const filter of [this.labelChip, this.filterCategory, this.filterTag, this.filterPrice, this.filterDuration, this.filterSortBy]) {
      await expect(filter).toBeVisible();
    }
    await (resetAll ? expect(this.resetAllBtn).toBeVisible() : expect(this.resetAllBtn).not.toBeAttached());
  }

  // An applied category shows as a chip next to "Reset All".
  async validateCategoryApplied(category: string) {
    await expect(this.list.main.getByText(category, { exact: true }).first()).toBeVisible();
    await expect(this.resetAllBtn).toBeVisible();
  }

  async validateChips(texts: string[]) {
    for (const text of texts) await expect(this.chip(text)).toBeVisible();
  }

  // `expected` is the decoded value, so a comma-separated list reads `a,b`.
  async validateUrlParam(name: string, expected: string) {
    await expect.poll(() => new URL(this.list.page.url()).searchParams.get(name)).toBe(expected);
  }

  async validateNoFilterParams() {
    await expect.poll(() => FILTER_PARAMS.filter(name => new URL(this.list.page.url()).searchParams.has(name))).toEqual([]);
  }

  async selectCategories(categories: string[]) {
    await this.filterCategory.click();
    await expect(this.categoryDialog).toBeVisible();
    for (const category of categories) {
      const option = this.categoryDialog.getByRole('option', { name: category, exact: true });
      await option.scrollIntoViewIfNeeded();
      await option.click();
      await expect(option).toHaveAttribute('aria-checked', 'true');
    }
    await this.closeFilter();
  }

  async unselectCategory(category: string) {
    await this.filterCategory.click();
    await expect(this.categoryDialog).toBeVisible();
    const option = this.categoryDialog.getByRole('option', { name: category, exact: true });
    await option.click();
    await expect(option).toHaveAttribute('aria-checked', 'false');
    await this.closeFilter();
  }

  async validateCategoryChecked(category: string, checked: boolean) {
    await this.filterCategory.click();
    await expect(this.categoryDialog).toBeVisible();
    await expect(this.categoryDialog.getByRole('option', { name: category, exact: true })).toHaveAttribute('aria-checked', String(checked));
    await this.closeFilter();
  }

  // The tag list is contextual, so the tags are the first options on offer at run time. Returns their names.
  async selectFirstTags(count: number): Promise<string[]> {
    await this.filterTag.click();
    await expect(this.tagDialog).toBeVisible();
    const options = this.tagDialog.getByRole('option');
    await expect(options.nth(count - 1)).toBeVisible();
    const names = (await options.allInnerTexts()).slice(0, count);
    for (const name of names) {
      const option = this.tagDialog.getByRole('option', { name, exact: true });
      await option.click();
      await expect(option).toHaveAttribute('aria-selected', 'true');
    }
    await this.closeFilter();
    return names;
  }

  async unselectTag(tag: string) {
    await this.filterTag.click();
    await expect(this.tagDialog).toBeVisible();
    const option = this.tagDialog.getByRole('option', { name: tag, exact: true });
    await option.click();
    await expect(option).toHaveAttribute('aria-selected', 'false');
    await this.closeFilter();
  }

  async validateTagSelected(tag: string, selected: boolean) {
    await this.filterTag.click();
    await expect(this.tagDialog).toBeVisible();
    await expect(this.tagDialog.getByRole('option', { name: tag, exact: true })).toHaveAttribute('aria-selected', String(selected));
    await this.closeFilter();
  }

  async selectPrice(option: PriceOptionType) {
    await this.filterPrice.click();
    await expect(this.priceDialog).toBeVisible();
    await this.priceDialog.getByRole('option', { name: option, exact: true }).click();
    await this.validateUrlParam(option.toLowerCase(), 'true');
    await this.closeFilter();
  }

  async setPriceRange(from: number, to: number) {
    await this.filterPrice.click();
    await expect(this.priceDialog).toBeVisible();
    await commitRangeValue(this.priceDialog.getByRole('menuitem', { name: 'From' }), from, 'minPrice');
    await commitRangeValue(this.priceDialog.getByRole('menuitem', { name: 'To' }), to, 'maxPrice');
    await this.closeFilter();
  }

  async validatePriceFrom(value: number) {
    await this.filterPrice.click();
    await expect(this.priceDialog).toBeVisible();
    await expect(this.priceDialog.getByRole('menuitem', { name: 'From' })).toHaveValue(String(value));
    await this.closeFilter();
  }

  async setDuration(from: number, to: number) {
    await this.filterDuration.click();
    await expect(this.durationDialog).toBeVisible();
    await commitRangeValue(this.durationDialog.getByRole('menuitem', { name: 'Minimum duration in seconds' }), from, 'minDuration');
    await commitRangeValue(this.durationDialog.getByRole('menuitem', { name: 'Maximum duration in seconds' }), to, 'maxDuration');
    await this.closeFilter();
  }

  async validateDurationFrom(value: number) {
    await this.filterDuration.click();
    await expect(this.durationDialog).toBeVisible();
    await expect(this.durationDialog.getByRole('menuitem', { name: 'Minimum duration in seconds' })).toHaveValue(String(value));
    await this.closeFilter();
  }

  async sortBy(option: SortByType) {
    await this.filterSortBy.click();
    await expect(this.sortByDialog).toBeVisible();
    await this.sortByDialog.getByRole('menuitemradio', { name: option, exact: true }).click();
    await expect(this.sortByDialog).not.toBeAttached();
  }

  async validateSortSelected(option: SortByType) {
    await this.filterSortBy.click();
    await expect(this.sortByDialog).toBeVisible();
    await expect(this.sortByDialog.getByRole('menuitemradio', { name: option, exact: true })).toHaveAttribute('aria-checked', 'true');
    await this.closeFilter();
  }

  async resetAll() {
    await this.resetAllBtn.click();
    await expect(this.resetAllBtn).not.toBeAttached();
  }
}
