import { expect, Locator, Page } from '@playwright/test';
import { HeaderPage } from '../HeaderPage';
import { RingtonesFiltersBar } from './RingtonesFiltersBar';
import { RingtoneCards } from './RingtoneCards';
import { dismissCookieBanner } from '../../src/utils/helper';

export class RingtonesListPage extends HeaderPage {
  readonly filtersBar: RingtonesFiltersBar;
  readonly cards: RingtoneCards;

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
    this.cards = new RingtoneCards(this);
    this.cardsAll = this.cards.all;
  }

  // Any /ringtones URL: dismiss the cookie banner before a test interacts (same contract as WallpapersListPage.open).
  async open(path = '/ringtones') {
    await this.page.goto(path);
    await expect(this.ringtonesTitle).toBeVisible();
    await dismissCookieBanner(this.page);
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
}
