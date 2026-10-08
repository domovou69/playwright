import { expect, Locator, Page } from '@playwright/test';
import { dismissCookieBanner, waitForHydration } from '../utils/helper';
import { Header } from './header.component';

export type SortOption = 'Relevance' | 'Newest first' | 'Price: Low to High' | 'Price: High to Low' | 'Most popular';
export type FilterName = 'Category' | 'Price' | 'Color' | 'Sort by';

/**
 * A feed of wallpaper cards with the filter bar. Shared by /wallpapers (incl. ?keyword=),
 * and /category/wallpapers/<slug>, which render the same grid.
 */
export class WallpaperFeedPage {
  readonly header: Header;
  readonly heading: Locator;
  readonly cards: Locator;
  readonly premiumCards: Locator;
  readonly freeCards: Locator;
  readonly resetAll: Locator;
  readonly emptyState: Locator;
  readonly errorHeading: Locator;
  readonly activeFiltersLabel: Locator;

  constructor(protected readonly page: Page) {
    this.header = new Header(page);
    this.heading = page.getByRole('heading', { level: 1 });
    // Detail links only: category links live under /category/wallpapers/.
    this.cards = page.locator('main a[href^="/wallpapers/"]');
    // A premium card shows its price as the only text of the link; free cards have no text.
    this.premiumCards = this.cards.filter({ hasText: /^\s*\d+\s*$/ });
    this.freeCards = this.cards.filter({ hasNotText: /\d/ });
    this.resetAll = page.getByRole('main').getByText('Reset All', { exact: true });
    this.emptyState = page.getByText('Couldn’t find anything');
    this.errorHeading = page.getByRole('heading', { name: /Oops/ });
    this.activeFiltersLabel = page.getByRole('main').getByText(/Filters \(\d+\)/);
  }

  async goto(path = '/wallpapers') {
    const response = await this.page.goto(path, {
      waitUntil: 'domcontentloaded',
    });
    await dismissCookieBanner(this.page, 3000);
    await waitForHydration(this.page);
    return response;
  }

  /** The un-stuck filter bar button; a sticky copy of the bar appears once the page is scrolled. */
  private filterButton(name: FilterName) {
    return this.page.getByRole('main').getByRole('button', { name, exact: true }).first();
  }

  /** Dropdown entries: checkbox-like `option`s, except Sort by which is a `menuitemradio` group. */
  private get entries() {
    return this.page.locator('[role=option], [role=menuitemradio]');
  }

  private option(name: string) {
    return this.entries.filter({
      hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`),
    });
  }

  /** The feed refreshes after a filter change; until then the old cards are still on screen, so poll. */
  async expectNoPremiumCards() {
    await expect.poll(() => this.premiumCards.count(), { message: 'premium cards left in a free-only feed' }).toBe(0);
  }

  async expectOnlyPremiumCards() {
    await expect
      .poll(async () => (await this.cardPrices()).every(price => price > 0), { message: 'every card has a price' })
      .toBe(true);
  }

  async waitForCards(min = 1) {
    await expect(this.cards.nth(min - 1)).toBeVisible();
  }

  async cardCount() {
    return this.cards.count();
  }

  async cardHrefs(): Promise<string[]> {
    return this.cards.evaluateAll(links => links.map(a => a.getAttribute('href') ?? ''));
  }

  async openFilter(name: FilterName) {
    // The bar is server-rendered before it hydrates; an early click is swallowed, so retry until it opens.
    await expect(async () => {
      if ((await this.entries.count()) === 0) await this.filterButton(name).click({ timeout: 2000 });
      await expect(this.entries.first()).toBeVisible({ timeout: 2000 });
    }).toPass();
  }

  async closeDropdown() {
    await this.page.keyboard.press('Escape');
    await expect(this.entries).toHaveCount(0);
  }

  async optionLabels(name: FilterName): Promise<string[]> {
    await this.openFilter(name);
    const labels = (await this.entries.allInnerTexts()).map(t => t.trim());
    await this.closeDropdown();
    return labels;
  }

  /**
   * Selects an option from a dropdown and waits for the URL to carry the filter. Options can be inert for a
   * moment after the menu opens (still hydrating), so click until the URL moves; a multi-select option that
   * is already checked is never clicked again (that would toggle it off).
   */
  async choose(filter: FilterName, option: string, urlPart: RegExp) {
    await this.openFilter(filter);
    await expect(async () => {
      if ((await this.entries.count()) === 0) await this.openFilter(filter);
      const entry = this.option(option);
      if ((await entry.locator('[data-state=checked]').count()) === 0) await entry.click({ timeout: 3000 });
      await expect(this.page).toHaveURL(urlPart, { timeout: 5000 });
    }).toPass();
    await this.closeDropdown();
  }

  async sortBy(option: SortOption, urlPart: RegExp) {
    await this.choose('Sort by', option, urlPart);
  }

  /**
   * Scrolls down the way a user does, in small wheel steps, until more cards arrive. The next page is
   * requested when a sentinel scrolls into view; jumping straight to the bottom (End, scrollTo) skips it.
   */
  async scrollToLoadMore() {
    const before = await this.cardCount();
    await expect
      .poll(
        async () => {
          await this.page.mouse.wheel(0, 700);
          await this.page.waitForTimeout(300);
          return this.cardCount();
        },
        {
          message: 'more cards load on scroll',
          timeout: 45_000,
          intervals: [0],
        }
      )
      .toBeGreaterThan(before);
    return this.cardCount();
  }

  /** Active-filter chips (second row of the bar). Each chip is a label with an adjacent remove control. */
  chip(label: string) {
    return this.page
      .getByRole('main')
      .getByText(label, { exact: true })
      .locator('xpath=ancestor-or-self::*[self::button or self::div][1]');
  }

  /** Chip click; retried because chips hydrate after the dropdown buttons do. */
  async removeChip(label: RegExp, urlAfter: RegExp) {
    const chip = this.page.getByRole('main').getByRole('button', { name: label });
    await expect(async () => {
      if (await chip.count()) await chip.click({ timeout: 1500 });
      await expect(this.page).toHaveURL(urlAfter, { timeout: 2500 });
    }).toPass();
  }

  async reset() {
    await expect(async () => {
      if (await this.resetAll.count()) await this.resetAll.click({ timeout: 1500 });
      await expect(this.page).toHaveURL(/\/wallpapers(\/)?$/, {
        timeout: 2500,
      });
    }).toPass();
  }

  async selectFirstTag() {
    const options = this.page.getByRole('option');
    await expect(async () => {
      if ((await options.count()) === 0)
        await this.page.getByRole('main').getByRole('combobox').first().click({ timeout: 3000 });
      await expect(options.first()).toBeVisible({ timeout: 3000 });
    }).toPass();
    const label = (await options.first().innerText()).trim();
    await options.first().click();
    await this.closeDropdown();
    return label;
  }

  async openCategoriesMenu() {
    await this.page.getByRole('button', { name: 'Categories' }).click();
  }

  /** Price shown on every card as a number (0 for free), in feed order. */
  async cardPrices(): Promise<number[]> {
    return this.cards.evaluateAll(links =>
      links.map(a => {
        const text = (a as HTMLElement).innerText.trim();
        return /^\d+$/.test(text) ? Number(text) : 0;
      })
    );
  }

  /** Opens the card at `index`; re-resolved by href because the grid re-renders while hydrating. */
  async openCard(index = 0) {
    const href = (await this.cardHrefs())[index]!;
    await expect(async () => {
      await this.page.locator(`main a[href="${href}"]`).first().click({ timeout: 3000 });
      await this.page.waitForURL(/\/wallpapers\/[0-9a-f-]{36}$/, {
        timeout: 4000,
      });
    }).toPass();
  }
}
