import { expect, Locator, Page } from '@playwright/test';
import { HeaderPage } from './HeaderPage';
import { AudioCards } from './AudioCards';
import { CardListScroller } from './CardListScroller';
import { dismissCookieBanner } from '../src/utils/helper';

// The list page shared by ringtones and notification sounds: heading, empty state, cards grid, scroller and `open(path)`.
// A subclass adds its filters bar and builds its cards (the href prefix and aria-label rule differ per area).
export abstract class AudioListPage extends HeaderPage {
  readonly main: Locator;
  readonly title: Locator;
  readonly noResultsHeading: Locator;
  readonly cardsContainer: Locator;
  abstract readonly cards: AudioCards;
  abstract readonly scroll: CardListScroller;

  constructor(
    page: Page,
    private readonly basePath: string
  ) {
    super(page);
    this.main = this.page.locator('main');
    this.title = this.main.locator('h1');
    // Typographic apostrophe on the site, hence the `.?`; the "All" scope uses a different empty state with suggestions.
    this.noResultsHeading = this.main.getByRole('heading', { name: /couldn.?t find anything/i });
    this.cardsContainer = this.main.locator('div[class*="CardsContainer"]').last();
  }

  get cardsAll(): Locator {
    return this.cards.all;
  }

  // Any URL of the area: dismiss the cookie banner before a test interacts (same contract as WallpapersListPage.open).
  async open(path = this.basePath) {
    await this.page.goto(path);
    await expect(this.title).toBeVisible();
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
