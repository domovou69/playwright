import { expect, Locator, Page } from '@playwright/test';
import { TIMEOUTS } from '../src/config/timeouts';
import { hasUniqueValues } from '../src/utils/helper';

// Shared by the wallpapers and ringtones lists: card hrefs, gradual scroll, auto-load and the "Load more" button.
export class CardListScroller {
  readonly loadMoreBtn: Locator;

  constructor(
    private readonly page: Page,
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

  compareCardsHrefArrays(currentHrefArr: string[], previousHrefArr: string[]) {
    if (currentHrefArr.length < previousHrefArr.length) throw new Error('Current href array is shorter than previous one');

    for (let i = 0; i < previousHrefArr.length; i++) {
      if (currentHrefArr[i] !== previousHrefArr[i]) throw new Error('Order of hrefs does not match between previous and current arrays');
    }
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
        { timeout: 10000, intervals: [500] }
      )
      .toBe(true);
    return hrefsAfter;
  }

  // Wheel inside the poll, up a little then down: at the very bottom a plain wheel-down does nothing, the next batch loads when
  // the end of the list is re-entered. After "Load more" the page keeps growing, so "scroll to the bottom" never ends either.
  // New cards render as skeletons first.
  private async wheelUntilGrown(hrefsBefore: string[], { orLoadMore }: { orLoadMore: boolean }) {
    const viewport = this.page.viewportSize();
    if (viewport) await this.page.mouse.move(viewport.width / 2, viewport.height / 2);
    await expect
      .poll(
        async () => {
          await this.page.mouse.wheel(0, -300);
          await this.page.mouse.wheel(0, 600);
          const grown = (await this.getCardsHref()).length > hrefsBefore.length;
          return grown || (orLoadMore && (await this.loadMoreBtn.isVisible()));
        },
        { timeout: 30000, intervals: [300] }
      )
      .toBe(true);
  }

  async validateScrollAppends(hrefsBefore: string[]): Promise<string[]> {
    await this.wheelUntilGrown(hrefsBefore, { orLoadMore: false });
    return this.validateOrderedAppend(hrefsBefore);
  }

  async validateLoadMoreAppends(hrefsBefore: string[]): Promise<string[]> {
    await this.loadMoreBtn.click();
    await expect.poll(async () => (await this.getCardsHref()).length, { timeout: 15000, intervals: [500] }).toBeGreaterThan(hrefsBefore.length);
    return this.validateOrderedAppend(hrefsBefore);
  }

  // Scroll until "Load more" shows (at most `maxRounds`); each round must append cards and keep the previous ones in order.
  async validateAutoLoadUntilLoadMore(maxRounds = 6): Promise<string[]> {
    await expect(this.loadMoreBtn).toBeAttached({ attached: false });
    let hrefs = await this.getCardsHref();
    for (let round = 0; round < maxRounds && !(await this.loadMoreBtn.isVisible()); round++) {
      await this.wheelUntilGrown(hrefs, { orLoadMore: true });
      hrefs = await this.validateOrderedAppend(hrefs);
    }
    await expect(this.loadMoreBtn).toBeVisible();
    await expect(this.loadMoreBtn).toBeEnabled();
    return hrefs;
  }
}
