import { expect, Locator, Page } from '@playwright/test';
import { HeaderPage } from '../HeaderPage';
import { RingtonesFiltersBar } from './RingtonesFiltersBar';
import { dismissCookieBanner } from '../../src/utils/helper';

export class RingtonesListPage extends HeaderPage {
  readonly filtersBar: RingtonesFiltersBar;

  readonly main: Locator;
  readonly ringtonesTitle: Locator;
  readonly noResultsHeading: Locator;

  readonly cardsContainer: Locator;
  readonly cardsAll: Locator;

  constructor(page: Page) {
    super(page);
    this.main = this.page.locator('main');
    this.ringtonesTitle = this.main.locator('h1');
    this.filtersBar = new RingtonesFiltersBar(this);
    // Typographic apostrophe on the site, hence the `.?`; the "All" scope uses a different empty state with suggestions.
    this.noResultsHeading = this.main.getByRole('heading', { name: /couldn.?t find anything/i });

    this.cardsContainer = this.main.locator('div[class*="CardsContainer"]').last();
    this.cardsAll = this.cardsContainer.locator(':scope > a[class*="A_link"]');
  }

  // Any /ringtones URL: dismiss the cookie banner before a test interacts (same contract as WallpapersListPage.open).
  async open(path = '/ringtones') {
    await this.page.goto(path);
    await expect(this.ringtonesTitle).toBeVisible();
    await dismissCookieBanner(this.page);
  }

  async validateCommonRingtone(card: Locator) {
    await expect(card).toHaveAttribute('href', /^\/ringtones\/[a-f0-9-]{36}$/);
    await expect(card).not.toHaveAttribute('title', '');
    const title = (await card.getAttribute('title')) ?? '';
    await expect(card).toHaveAttribute('aria-label', `Ringtone: ${title}`);
    await expect(card.locator('button[title="Play audio"]')).toBeVisible();
    await expect(card.locator('p[data-size="sm"]')).toHaveText(/^\d+ s$/);
  }

  // A card with a price badge has a crown and a digits-only price; a crown alone is not a price (free items can carry one).
  async validateCardPrice(card: Locator) {
    const badge = card.locator('div[class*="card-footer"] [class*="badge"]');
    if ((await badge.count()) === 0) return;
    await expect(card.locator('div[class*="card-header"]')).toBeVisible();
    await expect(badge).toHaveText(/^\d+$/);
  }

  // Search matches are not title-only (tags too): assert that at least one card title carries one of the words.
  async validateSomeTitleContainsAnyWord(words: string[]) {
    const pattern = new RegExp(words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
    await expect
      .poll(async () => {
        const titles = await this.cardsAll.evaluateAll(cards => cards.map(card => card.getAttribute('title') ?? ''));
        return titles.some(title => pattern.test(title));
      })
      .toBe(true);
  }

  async validateFirstCards(limit: number) {
    await expect(this.cardsAll.first()).toBeVisible();
    const count = Math.min(limit, await this.cardsAll.count());
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const card = this.cardsAll.nth(i);
      await this.validateCommonRingtone(card);
      await this.validateCardPrice(card);
    }
  }
}
