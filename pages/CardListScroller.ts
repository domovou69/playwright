import { expect, Locator } from '@playwright/test';
import { TIMEOUTS } from '../src/config/timeouts';
import { hasUniqueValues } from '../src/utils/helper';

// Shared by the wallpapers and ringtones lists: card hrefs, gradual scroll, auto-load and the "Load more" button.
export class CardListScroller {
  readonly loadMoreBtn: Locator;

  constructor(
    private readonly cards: Locator,
    main: Locator
  ) {
    this.loadMoreBtn = main.getByRole('button', { name: 'Load more' });
  }

  // One atomic read: per-card waits hung until the test timeout when the list re-rendered to fewer cards mid-loop.
  async getCardsHref(): Promise<string[]> {
    const hrefs = await this.cards.evaluateAll(cards => cards.map(card => card.getAttribute('href') || ''));
    return hrefs.filter(Boolean);
  }

  async waitForCardsToUpdate(hrefsBefore: string[]) {
    await expect.poll(() => this.getCardsHref(), { timeout: TIMEOUTS.expect, intervals: [500] }).not.toEqual(hrefsBefore);
  }

  // Appended cards keep the previous ones in order and add no duplicates. Polled: right after "Load more" the cards locator can
  // briefly match nothing (the last CardsContainer is the one with the skeletons). Returns the settled hrefs.
  private async validateOrderedAppend(hrefsBefore: string[]): Promise<string[]> {
    let hrefsAfter: string[] = [];
    await expect
      .poll(
        async () => {
          hrefsAfter = await this.getCardsHref();
          return hrefsAfter.length >= hrefsBefore.length && hrefsBefore.every((href, i) => hrefsAfter[i] === href) && hasUniqueValues(hrefsAfter);
        },
        { timeout: TIMEOUTS.expect, intervals: [500] }
      )
      .toBe(true);
    return hrefsAfter;
  }

  // Keeps the last card on screen: it triggers the next batch (and its images), while a wheel drifts past the list into the footer.
  // After "Load more" the page keeps growing, so "scroll to the bottom" never ends. New cards render as skeletons first.
  private async scrollToLastCardUntil(done: () => Promise<boolean>) {
    await expect
      .poll(
        async () => {
          await this.cards.last().scrollIntoViewIfNeeded();
          return done();
        },
        { timeout: TIMEOUTS.expect, intervals: [300] }
      )
      .toBe(true);
  }

  private async hasGrown(hrefsBefore: string[]) {
    return (await this.getCardsHref()).length > hrefsBefore.length;
  }

  // Each round must append cards and keep the previous ones in order.
  async validateScrollAppends(hrefsBefore: string[], rounds = 1): Promise<string[]> {
    let hrefs = hrefsBefore;
    for (let round = 0; round < rounds; round++) {
      const hrefsRoundStart = hrefs;
      await this.scrollToLastCardUntil(() => this.hasGrown(hrefsRoundStart));
      hrefs = await this.validateOrderedAppend(hrefsRoundStart);
    }
    return hrefs;
  }

  async validateLoadMoreAppends(hrefsBefore: string[]): Promise<string[]> {
    await this.loadMoreBtn.click();
    await expect
      .poll(async () => (await this.getCardsHref()).length, { timeout: TIMEOUTS.expect, intervals: [500] })
      .toBeGreaterThan(hrefsBefore.length);
    return this.validateOrderedAppend(hrefsBefore);
  }

  // Scroll until "Load more" shows (at most `maxRounds`); each round must append cards and keep the previous ones in order.
  async validateAutoLoadUntilLoadMore(maxRounds = 6): Promise<string[]> {
    await expect(this.loadMoreBtn).toBeAttached({ attached: false });
    let hrefs = await this.getCardsHref();
    for (let round = 0; round < maxRounds && !(await this.loadMoreBtn.isVisible()); round++) {
      await this.scrollToLastCardUntil(async () => (await this.hasGrown(hrefs)) || (await this.loadMoreBtn.isVisible()));
      hrefs = await this.validateOrderedAppend(hrefs);
    }
    await expect(this.loadMoreBtn).toBeVisible();
    await expect(this.loadMoreBtn).toBeEnabled();
    return hrefs;
  }
}
