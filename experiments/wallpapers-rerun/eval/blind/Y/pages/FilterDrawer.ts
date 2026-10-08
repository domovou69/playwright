import { expect, Locator, Page } from '@playwright/test';

/** The open dropdown of a list filter (options, Tag search list and the Price range inputs). */
export class FilterDrawer {
  readonly root: Locator;
  readonly options: Locator;
  private readonly checkedState: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.options = this.root.getByRole('option');
    this.checkedState = page.locator('[aria-checked="true"], [aria-selected="true"]');
  }

  /** Category / Tag / Price / Color rows are `option`s, the Sort by rows are `menuitemradio`s. */
  option(name: string): Locator {
    return this.root.getByRole('option', { name, exact: true }).or(this.root.getByRole('menuitemradio', { name, exact: true }));
  }

  /** The Price range inputs ("From" / "To") are `menuitem`s that is itself the number input. */
  priceInput(label: 'From' | 'To'): Locator {
    return this.root.getByRole('menuitem', { name: label });
  }

  /** A single-choice menu (Sort by) closes on a pick, so there is no selected state to wait for. */
  async pick(name: string) {
    await this.option(name).click();
  }

  /** Waits for the new state: a second click before the first one is applied drops the first selection (seen live). */
  async select(name: string) {
    await this.option(name).click();
    await this.validateSelected(name, true);
  }

  async deselect(name: string) {
    await this.option(name).click();
    await this.validateSelected(name, false);
  }

  /** The first `count` option names; the Tag list is contextual, so the names are read at run time. */
  private async firstOptionNames(count: number): Promise<string[]> {
    await expect(this.options).not.toHaveCount(0);
    await expect(this.options.nth(count - 1)).toBeVisible();
    const names = await this.options.evaluateAll((elements, max) => elements.slice(0, max).map(element => element.textContent?.trim() ?? ''), count);
    expect(names.every(Boolean), 'empty option name').toBe(true);
    return names;
  }

  async firstOptionName(): Promise<string> {
    return (await this.firstOptionNames(1)).join();
  }

  async firstTwoOptionNames(): Promise<[string, string]> {
    const names = await this.firstOptionNames(2);
    return [names.at(0) ?? '', names.at(1) ?? ''];
  }

  async validatePriceValue(label: 'From' | 'To', value: string) {
    await expect(this.priceInput(label)).toHaveValue(value);
  }

  async validateSelected(name: string, selected: boolean) {
    await expect(this.option(name).and(this.checkedState)).toHaveCount(selected ? 1 : 0);
  }
}
