import { expect, Locator } from '@playwright/test';
import type { RingtonesListPage } from './RingtonesListPage';
import { validateCardLink } from '../CardLinkValidator';

const BADGE = 'div[class*="card-footer"] [class*="badge"]';
const DURATION = 'p[data-size="sm"]';

// The grid of ringtone cards: locators per card kind and the card validators.
export class RingtoneCards {
  readonly all: Locator;
  readonly priced: Locator;
  readonly free: Locator;

  constructor(list: RingtonesListPage) {
    this.all = list.cardsContainer.locator(':scope > a[class*="A_link"]');
    this.priced = this.all.filter({ has: list.page.locator('div[class*="card-footer"]') });
    this.free = this.all.filter({ hasNot: list.page.locator('div[class*="card-footer"]') });
  }

  badge(card: Locator): Locator {
    return card.locator(BADGE);
  }

  playButton(card: Locator): Locator {
    return card.locator('button[title="Play audio"]');
  }

  duration(card: Locator): Locator {
    return card.locator(DURATION);
  }

  async validateCommon(card: Locator) {
    await validateCardLink(card, 'ringtones', title => `Ringtone: ${title}`);
    await expect(this.playButton(card)).toBeVisible();
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
