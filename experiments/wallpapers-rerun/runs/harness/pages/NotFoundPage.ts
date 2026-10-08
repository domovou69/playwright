import { expect, Locator, Page } from '@playwright/test';
import { dismissCookieBanner } from '../src/utils/helper';
import { CardGrid } from './CardGrid';

/** The "Oops, couldn’t find it" page of an unknown item or category; it has no list heading, so `open` cannot be reused. */
export class NotFoundPage {
  readonly heading: Locator;
  readonly hint: Locator;
  readonly cards: CardGrid;

  constructor(
    private readonly page: Page,
    hrefPrefix: string
  ) {
    this.heading = page.getByRole('heading', { name: /oops, couldn.?t find it/i });
    this.hint = page.getByText('Try the search keywords below');
    this.cards = new CardGrid(page, hrefPrefix);
  }

  /** Returns the HTTP status of the navigation. */
  async open(path: string): Promise<number> {
    const response = await this.page.goto(path);
    await expect(this.heading).toBeVisible();
    await dismissCookieBanner(this.page);
    return response?.status() ?? 0;
  }

  async validateNotFound(status: number) {
    expect(status).toBe(404);
    await expect(this.heading).toBeVisible();
    await expect(this.hint).toBeVisible();
    await this.cards.validateNone();
  }
}
