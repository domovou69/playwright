import { expect, Locator, Page } from '@playwright/test';
import type { WallpapersListPage } from './WallpapersListPage';
import { DEFAULT_FILTERS_VALUES } from '../src/utils/locals';
import { FilterCategoriesType, SortByType } from '../src/types/types';

// Narrow-viewport layout: the inline filter bar collapses into a single "Filters"/"Filters (N)" chip that opens a
// side panel.
export class FilterDrawer {
  readonly chip: Locator;
  readonly dialog: Locator;
  readonly backBtn: Locator;
  readonly showResultsBtn: Locator;
  readonly freeCheckbox: Locator;
  readonly paidCheckbox: Locator;

  constructor(
    private readonly page: Page,
    private readonly list: WallpapersListPage
  ) {
    this.chip = list.main.getByRole('button', { name: /^Filters(\s\(\d+\))?$/ });
    // The <h2> isn't wired as the dialog's accessible name (no aria-labelledby), so the dialog matches on role
    // alone rather than a name - there is only ever one dialog open at a time in this flow.
    this.dialog = page.getByRole('dialog');
    // Same icon button throughout: closes the panel from its top-level row list, or goes back to that
    // row list from a drilled-down sub-view (Categories/Colors/Tags/Price/Sort By) - always the first
    // button in the dialog, confirmed live across every view.
    this.backBtn = this.dialog.getByRole('button').first();
    this.showResultsBtn = page.getByRole('button', { name: 'Show Results' });
    this.freeCheckbox = this.dialog.getByRole('checkbox', { name: 'Free' });
    this.paidCheckbox = this.dialog.getByRole('checkbox', { name: 'Paid' });
  }

  row(group: FilterCategoriesType): Locator {
    return this.dialog.getByRole('button', { name: new RegExp(`^${group}`, 'i') });
  }

  async validate(expected: Partial<{ categories: string; colors: string; tags: string; price: string; sortBy: string }> = {}) {
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByRole('heading', { name: 'Filters' })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: 'Clear all' })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: `Categories ${expected.categories ?? 'Any'}` })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: `Colors ${expected.colors ?? 'Any'}` })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: `Tags ${expected.tags ?? 'Any'}` })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: `Price ${expected.price ?? 'Any'}` })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: `Sort By ${expected.sortBy ?? 'Relevance'}` })).toBeVisible();
    await expect(this.showResultsBtn).toBeVisible();
  }

  async validateCategoriesView() {
    await expect(this.dialog.getByRole('heading', { name: 'Categories' })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(this.dialog.getByRole('textbox', { name: 'Search' })).toBeVisible();
  }

  async validateColorsView() {
    await expect(this.dialog.getByRole('heading', { name: 'Colors' })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: 'Clear' })).toBeVisible();
  }

  async validateTagsView() {
    await expect(this.dialog.getByRole('heading', { name: 'Tags' })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(this.dialog.getByRole('combobox', { name: 'Search' })).toBeVisible();
  }

  async validateSortByView(expectedChecked?: SortByType) {
    await expect(this.dialog.getByRole('heading', { name: 'Sort By' })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: 'Clear' })).toBeVisible();
    if (expectedChecked) await expect(this.dialog.getByRole('radio', { name: expectedChecked })).toBeChecked();
  }

  async validatePriceView(expected?: { free?: boolean; paid?: boolean }) {
    await expect(this.dialog.getByRole('heading', { name: 'Price' })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(this.freeCheckbox).toBeVisible();
    await expect(this.paidCheckbox).toBeVisible();
    if (expected?.free !== undefined) await expect(this.freeCheckbox).toBeChecked({ checked: expected.free });
    if (expected?.paid !== undefined) await expect(this.paidCheckbox).toBeChecked({ checked: expected.paid });
    await expect(this.dialog.getByRole('spinbutton', { name: 'From' })).toBeVisible();
    await expect(this.dialog.getByRole('spinbutton', { name: 'To' })).toBeVisible();
  }

  async openTab(group: FilterCategoriesType) {
    await this.row(group).click();
    switch (group) {
      case 'Categories':
        return this.validateCategoriesView();
      case 'Colors':
        return this.validateColorsView();
      case 'Tags':
        return this.validateTagsView();
      case 'Price':
        return this.validatePriceView();
      case 'Sort by':
        return this.validateSortByView();
    }
  }

  option(group: FilterCategoriesType, option: string): Locator {
    const role = { Categories: 'checkbox', Colors: 'checkbox', Price: 'checkbox', Tags: 'option', 'Sort by': 'radio' } as const;
    return this.dialog.getByRole(role[group], { name: option, exact: true });
  }

  async expectOptionSelected(group: FilterCategoriesType, option: string) {
    const locator = this.option(group, option);
    if (group === 'Tags') await expect(locator).toHaveAttribute('aria-selected', 'true');
    else await expect(locator).toBeChecked();
  }

  async expectRowDefault(group: FilterCategoriesType, isDefault = true) {
    const row = this.row(group);
    const defaultName = `${group} ${DEFAULT_FILTERS_VALUES[group][0]}`;
    if (isDefault) await expect(row).toHaveAccessibleName(defaultName, { ignoreCase: true });
    else await expect(row).not.toHaveAccessibleName(defaultName, { ignoreCase: true });
  }

  // The panel applies every change live (URL and cards update behind the open dialog), so each helper
  // below checks the result right after its own action, then that the row and the reopened tab kept it.
  async applyOption(group: FilterCategoriesType, option: string, urlContains: RegExp) {
    const hrefsBefore = await this.list.getCardsHref();
    await this.openTab(group);
    await this.option(group, option).click();
    await expect(this.page).toHaveURL(urlContains);
    await this.list.waitForCardsToUpdate(hrefsBefore);
    expect((await this.list.getCardsHref()).length).toBeGreaterThan(0);

    await this.backBtn.click();
    await this.expectRowDefault(group, false);
    await this.openTab(group);
    await this.expectOptionSelected(group, option);
    await this.backBtn.click();
  }

  // From/To only commit to the URL once blurred, and blurring both in a row races the two commits
  // (`minPrice=NaN`, same as setPriceRange above) - so each value is committed and awaited on its own.
  async applyPriceRange(from: number, to: number) {
    const hrefsBefore = await this.list.getCardsHref();
    await this.openTab('Price');
    const fromInput = this.dialog.getByRole('spinbutton', { name: 'From' });
    const toInput = this.dialog.getByRole('spinbutton', { name: 'To' });
    await fromInput.fill(String(from));
    await fromInput.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`minPrice=${from}`));
    await toInput.fill(String(to));
    await toInput.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`maxPrice=${to}`));
    await this.list.waitForCardsToUpdate(hrefsBefore);
    expect((await this.list.getCardsHref()).length).toBeGreaterThan(0);

    await this.backBtn.click();
    await this.expectRowDefault('Price', false);
    await this.openTab('Price');
    await expect(fromInput).toHaveValue(String(from));
    await expect(toInput).toHaveValue(String(to));
    await this.backBtn.click();
  }

  async clearTab(group: FilterCategoriesType) {
    const hrefsBefore = await this.list.getCardsHref();
    await this.openTab(group);
    await this.dialog.getByRole('button', { name: 'Clear', exact: true }).click();
    await this.list.waitForCardsToUpdate(hrefsBefore);
    await this.backBtn.click();
    await this.expectRowDefault(group);
  }

  async clearAll() {
    const hrefsBefore = await this.list.getCardsHref();
    await this.dialog.getByRole('button', { name: 'Clear all' }).click();
    await this.list.waitForCardsToUpdate(hrefsBefore);
    await this.validate();
  }
}
