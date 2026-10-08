import { expect, Locator, Page } from '@playwright/test';
import { hasUniqueValues } from '../src/utils/helper';
import { CardLinkValidator } from './CardLinkValidator';

const LOAD_TIMEOUT = 30_000;

/** The card grid of a list page with infinite scroll and "Load more"; `hrefPrefix` is the area (`/wallpapers`). */
export class CardGrid {
  readonly cards: Locator;
  readonly loadMore: Locator;
  private readonly validator: CardLinkValidator;

  constructor(
    private readonly page: Page,
    hrefPrefix: string
  ) {
    this.cards = page.locator(`a[href^="${hrefPrefix}/"]`);
    this.loadMore = page.getByRole('button', { name: 'Load more' });
    this.validator = new CardLinkValidator(hrefPrefix);
  }

  /** The count once it stops changing between two reads (the grid may still be rendering). */
  async settledCount(): Promise<number> {
    let previous = -1;
    await expect
      .poll(
        async () => {
          const count = await this.cards.count();
          const settled = count === previous;
          previous = count;
          return settled;
        },
        { intervals: [300], timeout: LOAD_TIMEOUT }
      )
      .toBe(true);
    return previous;
  }

  async hrefs(): Promise<string[]> {
    await this.settledCount();
    return this.cards.evaluateAll(elements => elements.map(element => element.getAttribute('href') ?? ''));
  }

  async validateFirst(limit: number) {
    expect(await this.settledCount()).toBeGreaterThan(0);
    await this.validator.validate(this.cards, limit);
  }

  /** Compares the first `count` hrefs with `baseline`; the grid re-renders after a filter, so poll. */
  async validateFirstHrefsDiffer(baseline: string[], count = 3) {
    await expect
      .poll(async () => (await this.hrefs()).slice(0, count), { intervals: [500], timeout: LOAD_TIMEOUT })
      .not.toEqual(baseline.slice(0, count));
  }

  /** Price badge of each of the first `limit` cards: the number, or null when the card has none. */
  private async prices(limit: number): Promise<(number | null)[]> {
    return this.cards.evaluateAll(
      (elements, max) =>
        elements.slice(0, max).map(element => {
          const text = element.querySelector('div[class*="card-footer"]')?.textContent?.trim() ?? '';
          return text ? Number(text) : null;
        }),
      limit
    );
  }

  async validateNoPriceBadges(limit: number) {
    await expect
      .poll(async () => (await this.prices(limit)).filter(price => price !== null), { intervals: [500], timeout: LOAD_TIMEOUT })
      .toEqual([]);
  }

  /** Every one of the first `limit` cards is priced (digits), optionally in a sort direction and from `atLeast`. */
  async validatePriced(limit: number, order?: 'asc' | 'desc', atLeast = 0, atMost = Number.POSITIVE_INFINITY) {
    await expect
      .poll(
        async () => {
          const prices = await this.prices(limit);
          if (prices.length === 0) return 'no cards';
          if (prices.some(price => price === null || Number.isNaN(price))) return `unpriced card in ${prices.join(',')}`;
          const numbers = prices as number[];
          if (numbers.some(price => price < atLeast)) return `price below ${atLeast} in ${numbers.join(',')}`;
          if (numbers.some(price => price > atMost)) return `price above ${atMost} in ${numbers.join(',')}`;
          const sign = order === 'desc' ? -1 : 1;
          const ordered = !order || numbers.every((price, index) => index === 0 || (price - (numbers[index - 1] ?? price)) * sign >= 0);
          return ordered ? 'ok' : `not ${order}: ${numbers.join(',')}`;
        },
        { intervals: [500], timeout: LOAD_TIMEOUT }
      )
      .toBe('ok');
  }

  /** The first card without a crown (a crown can come without a price, so only a crown-less card is surely free). */
  async firstWithoutCrown(): Promise<{ href: string; title: string }> {
    await this.settledCount();
    const found = await this.cards.evaluateAll(elements => {
      const card = elements.find(element => !element.querySelector('div[class*="card-header"] [style*="premium"]'));
      return card ? { href: card.getAttribute('href') ?? '', title: card.getAttribute('title') ?? '' } : null;
    });
    expect(found, 'no card without a crown among the rendered cards').not.toBeNull();
    return found ?? { href: '', title: '' };
  }

  /** The first card and its price badge (the card must be priced). */
  async firstPriced(): Promise<{ href: string; price: number }> {
    const [href = ''] = await this.hrefs();
    const [price = null] = await this.prices(1);
    expect(price, 'the first card has no price badge').not.toBeNull();
    return { href, price: price ?? 0 };
  }

  async open(href: string) {
    await this.cards
      .and(this.page.locator(`a[href="${href}"]`))
      .first()
      .click();
  }

  /** Clicks the first card and returns its href. */
  async openFirst(): Promise<string> {
    const [href = ''] = await this.hrefs();
    expect(href).not.toBe('');
    await this.open(href);
    return href;
  }

  /** None of the rendered cards links to `href` (the open item is not its own "Related"). */
  async validateNotLinkedTo(href: string) {
    const hrefs = await this.hrefs();
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs).not.toContain(href);
  }

  async validateNone() {
    await expect(this.cards).toHaveCount(0);
  }

  async validateAnyTitleContains(words: string[]) {
    await this.settledCount();
    const titles = await this.cards.evaluateAll(elements => elements.map(element => (element.getAttribute('title') ?? '').toLowerCase()));
    expect(
      titles.some(title => words.some(word => title.includes(word.toLowerCase()))),
      `no title contains any of: ${words.join(', ')}`
    ).toBe(true);
  }

  async validateLoadMoreHidden() {
    await expect(this.loadMore).toBeHidden();
  }

  async validateLoadMoreReady() {
    await expect(this.loadMore).toBeVisible();
    await expect(this.loadMore).toBeEnabled();
  }

  async scrollToLastCard() {
    await this.cards.last().scrollIntoViewIfNeeded();
    await this.page.mouse.wheel(0, 600);
  }

  /** Auto-loading stops and "Load more" appears after a few pages; scroll in rounds until then. */
  async scrollUntilLoadMoreVisible() {
    await expect
      .poll(
        async () => {
          await this.scrollToLastCard();
          return this.loadMore.isVisible();
        },
        { intervals: [1000], timeout: LOAD_TIMEOUT }
      )
      .toBe(true);
  }

  async clickLoadMore() {
    await this.loadMore.click();
  }

  /** More cards than `previous`, the old ones unchanged and in order, no duplicates. Returns the new list. */
  async validateAppended(previous: string[]): Promise<string[]> {
    await expect.poll(() => this.cards.count(), { intervals: [500], timeout: LOAD_TIMEOUT }).toBeGreaterThan(previous.length);
    const current = await this.hrefs();
    expect(current.slice(0, previous.length)).toEqual(previous);
    expect(hasUniqueValues(current), 'duplicate cards after loading more').toBe(true);
    return current;
  }
}
