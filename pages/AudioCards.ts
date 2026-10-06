import { expect, Locator, Page } from '@playwright/test';
import { validateCardLink } from './CardLinkValidator';
import { AudioPlayer } from './AudioPlayer';

const BADGE = 'div[class*="card-footer"] [class*="badge"]';
const DURATION = 'p[data-size="sm"]';

export type AudioCardsOptions = {
  area: 'ringtones' | 'notification-sounds';
  // A string is matched exactly; a RegExp is for an area whose aria-label prefix is not reliable.
  ariaLabelFor: (title: string) => string | RegExp;
};

// A grid of audio cards (a list page or a detail page's Related block): locators per card kind and the card validators.
// Shared by ringtones and notification sounds; the href prefix and the aria-label rule are the difference.
export class AudioCards {
  readonly all: Locator;
  readonly priced: Locator;
  readonly free: Locator;
  // A free card can still carry a crown (a "Premium" badge on its detail page), so "no crown" is the clean free case.
  readonly uncrowned: Locator;

  constructor(
    grid: { cardsContainer: Locator; page: Page },
    private readonly options: AudioCardsOptions
  ) {
    this.all = grid.cardsContainer.locator(':scope > a[class*="A_link"]');
    this.priced = this.all.filter({ has: grid.page.locator('div[class*="card-footer"]') });
    this.free = this.all.filter({ hasNot: grid.page.locator('div[class*="card-footer"]') });
    this.uncrowned = this.all.filter({ hasNot: grid.page.locator('div[class*="card-header"]') });
  }

  player(card: Locator): AudioPlayer {
    return new AudioPlayer(card);
  }

  async href(card: Locator): Promise<string> {
    return (await card.getAttribute('href')) ?? '';
  }

  async title(card: Locator): Promise<string> {
    return (await card.getAttribute('title')) ?? '';
  }

  async open(card: Locator) {
    await card.click();
  }

  // The digits of a priced card's badge.
  async price(card: Locator): Promise<string> {
    return (await this.badge(card).textContent())?.trim() ?? '';
  }

  badge(card: Locator): Locator {
    return card.locator(BADGE);
  }

  duration(card: Locator): Locator {
    return card.locator(DURATION);
  }

  async validateCommon(card: Locator) {
    await validateCardLink(card, this.options.area, this.options.ariaLabelFor);
    await expect(this.player(card).button).toBeVisible();
    await expect(this.duration(card)).toHaveText(/^\d+ s$/);
  }

  // A priced card has a crown and a digits-only price; a crown alone is not a price (free items can carry one).
  async validatePriced(card: Locator) {
    await expect(card.locator('div[class*="card-header"]')).toBeVisible();
    await expect(this.badge(card)).toHaveText(/^\d+$/);
  }

  async validateFree(card: Locator) {
    await expect(card.locator('div[class*="card-footer"]')).not.toBeAttached();
  }

  // The count is read once the list stops growing, so a card that is still rendering is not validated half-loaded.
  private async waitSettled() {
    await expect(this.all.first()).toBeVisible();
    let previous = -1;
    await expect
      .poll(async () => {
        const current = await this.all.count();
        const settled = current === previous;
        previous = current;
        return settled;
      })
      .toBe(true);
  }

  // One atomic read of every rendered card: a price is null on a free card.
  private async readValues(): Promise<{ price: number | null; seconds: number }[]> {
    return this.all.evaluateAll(
      (cards, selectors) =>
        cards.map(card => {
          const badge = card.querySelector(selectors.badge)?.textContent?.trim();
          return { price: badge ? Number(badge) : null, seconds: parseInt(card.querySelector(selectors.duration)?.textContent ?? '', 10) };
        }),
      { badge: BADGE, duration: DURATION }
    );
  }

  // Polled: right after a filter the grid can still show the previous list for a moment.
  private async validateValues(isValid: (value: { price: number | null; seconds: number }) => boolean) {
    await this.waitSettled();
    await expect.poll(async () => (await this.readValues()).filter(value => !isValid(value)).length).toBe(0);
    expect(await this.all.count()).toBeGreaterThan(0);
  }

  async validateAllFree() {
    await this.validateValues(({ price }) => price === null);
  }

  async validateAllPriced(range: { min?: number; max?: number } = {}) {
    const { min = 1, max = Infinity } = range;
    await this.validateValues(({ price }) => price !== null && price >= min && price <= max);
  }

  async validateDurationBetween(min: number, max = Infinity) {
    await this.validateValues(({ seconds }) => seconds >= min && seconds <= max);
  }

  async validatePricesNonIncreasing(limit = 10) {
    await this.waitSettled();
    await expect
      .poll(async () => {
        const prices = (await this.readValues()).slice(0, limit).map(({ price }) => price ?? 0);
        return prices.every((price, i) => i === 0 || price <= prices[i - 1]!);
      })
      .toBe(true);
  }

  async validateFirst(limit: number) {
    await this.waitSettled();
    const count = Math.min(limit, await this.all.count());
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const card = this.all.nth(i);
      await this.validateCommon(card);
    }
    for (const card of await this.priced.all()) await this.validatePriced(card);
    for (const card of await this.free.all()) await this.validateFree(card);
  }
}
