import { expect, Locator, Page } from '@playwright/test';
import { FilterDrawer } from './FilterDrawer';

export type FilterName = 'category' | 'tag' | 'price' | 'color' | 'sortBy';

/** The list filter bar: label chip, Category / Tag / Price / Color / Sort by, active-filter chips and "Reset All". */
export class FiltersBar {
  readonly labelChip: Locator;
  readonly category: Locator;
  readonly tag: Locator;
  readonly price: Locator;
  readonly color: Locator;
  readonly sortBy: Locator;
  readonly resetAll: Locator;
  private readonly main: Locator;

  constructor(
    private readonly page: Page,
    private readonly drawer: FilterDrawer
  ) {
    this.main = page.getByRole('main');
    this.labelChip = this.main.getByRole('button', { name: 'Wallpapers', exact: true });
    this.category = this.main.getByRole('button', { name: 'Category', exact: true });
    this.tag = this.main.getByRole('combobox').filter({ hasText: 'Tag' });
    this.price = this.main.getByRole('button', { name: 'Price', exact: true });
    this.color = this.main.getByRole('button', { name: 'Color', exact: true });
    this.sortBy = this.main.getByRole('button', { name: 'Sort by', exact: true });
    this.resetAll = this.main.getByRole('button', { name: 'Reset All' });
  }

  private control(filter: FilterName): Locator {
    return this[filter];
  }

  /** An active-filter chip (an option value such as "Nature" or "Free"). */
  chip(name: string): Locator {
    // The chip shows the raw value ("black") and CSS capitalises it, so match case-insensitively.
    return this.main.getByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  }

  async open(filter: FilterName) {
    await this.control(filter).click();
    await expect(this.drawer.root).toBeVisible();
  }

  /** Escape, not a click outside or `force`: the dropdown covers the bar while it is open. */
  async closeFilter() {
    await this.page.keyboard.press('Escape');
    await expect(this.drawer.root).toBeHidden();
  }

  /** Open the filter, pick every option in order and close the dropdown. */
  async apply(filter: FilterName, options: string[]) {
    await this.open(filter);
    for (const option of options) {
      await this.drawer.select(option);
    }
    await this.closeFilter();
  }

  /** Each bound is committed on its own (Tab) and waited for in the URL; From alone gives `maxPrice=NaN` (see the plan). */
  async applyPriceRange(from: number, to: number) {
    await this.open('price');
    await this.drawer.priceInput('From').fill(String(from));
    await this.page.keyboard.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`minPrice=${from}(&|$)`));
    await this.drawer.priceInput('To').fill(String(to));
    await this.page.keyboard.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`maxPrice=${to}(&|$)`));
    await this.closeFilter();
  }

  async applySort(option: string) {
    await this.open('sortBy');
    await this.drawer.pick(option);
    await this.closeFilter();
  }

  async clickResetAll() {
    await this.resetAll.click();
  }

  async validateDefaultState() {
    for (const control of [this.labelChip, this.category, this.tag, this.price, this.color, this.sortBy]) {
      await expect(control).toBeVisible();
    }
    await expect(this.resetAll).toBeHidden();
  }

  /** The bar is absent (category pages have chips and cards, but no filters). */
  async validateAbsent() {
    for (const control of [this.category, this.tag, this.price, this.color, this.sortBy, this.resetAll]) {
      await expect(control).toBeHidden();
    }
  }

  async validateChips(names: string[]) {
    for (const name of names) {
      await expect(this.chip(name)).toBeVisible();
    }
  }

  async validateChipsHidden(names: string[]) {
    for (const name of names) {
      await expect(this.chip(name)).toBeHidden();
    }
  }

  async validateResetAll(visible: boolean) {
    if (visible) await expect(this.resetAll).toBeVisible();
    else await expect(this.resetAll).toBeHidden();
  }
}
