import { expect, Locator } from '@playwright/test';
import type { RingtonesListPage } from './RingtonesListPage';
import { validateCardLink } from '../CardLinkValidator';

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
    return card.locator('div[class*="card-footer"] [class*="badge"]');
  }

  playButton(card: Locator): Locator {
    return card.locator('button[title="Play audio"]');
  }

  duration(card: Locator): Locator {
    return card.locator('p[data-size="sm"]');
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
  async validateFirst(limit: number) {
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
