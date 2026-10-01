import { expect, Locator } from '@playwright/test';
import type { RingtonesListPage } from './RingtonesListPage';

// The inline filter bar above the ringtone cards. Same shape as the wallpapers FiltersBar, but with Duration instead of
// Color and Tag as a combobox. Dialogs and option helpers are added by the filters group.
export class RingtonesFiltersBar {
  readonly labelChip: Locator;
  readonly filterCategory: Locator;
  readonly filterTag: Locator;
  readonly filterPrice: Locator;
  readonly filterDuration: Locator;
  readonly filterSortBy: Locator;
  readonly resetAllBtn: Locator;

  constructor(list: RingtonesListPage) {
    const main = list.main;
    // Exact-match regexes: an applied-value chip sits in the same `main button` pool as the filter button.
    this.labelChip = main.getByText('Ringtones', { exact: true }).first();
    this.filterCategory = main.locator('button', { hasText: /^Category$/ });
    this.filterTag = main.getByRole('combobox').filter({ hasText: /^Tag$/ });
    this.filterPrice = main.locator('button', { hasText: /^Price$/ });
    this.filterDuration = main.locator('button', { hasText: /^Duration$/ });
    this.filterSortBy = main.locator('button', { hasText: /^Sort by$/ });
    this.resetAllBtn = main.locator('button', { hasText: 'Reset All' });
  }

  // Every filter is shown; "Reset All" appears only once a filter is applied, so the expectation is a parameter.
  async validateVisible({ resetAll = false }: { resetAll?: boolean } = {}) {
    for (const filter of [this.labelChip, this.filterCategory, this.filterTag, this.filterPrice, this.filterDuration, this.filterSortBy]) {
      await expect(filter).toBeVisible();
    }
    await (resetAll ? expect(this.resetAllBtn).toBeVisible() : expect(this.resetAllBtn).not.toBeAttached());
  }
}
