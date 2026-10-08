import { expect, Locator } from '@playwright/test';

/** Invariants of a content card link (`a[href^="<prefix>/<GUID>"]`), shared by every area's card grid. */
export class CardLinkValidator {
  private readonly hrefPattern: RegExp;

  constructor(hrefPrefix: string) {
    this.hrefPattern = new RegExp(`^${hrefPrefix}/[a-f0-9-]{36}$`);
  }

  /** Reads the first `limit` cards in one pass and fails with every broken card, not just the first. */
  async validate(cards: Locator, limit: number) {
    const problems = await cards.evaluateAll(
      (elements, { source, max }) => {
        const pattern = new RegExp(source);
        return elements.slice(0, max).flatMap((element, index) => {
          const found: string[] = [];
          const href = element.getAttribute('href') ?? '';
          const title = element.getAttribute('title') ?? '';
          if (!pattern.test(href)) found.push('href does not match');
          if (!title.trim()) found.push('empty title');
          if (element.getAttribute('aria-label') !== title) found.push('aria-label differs from title');
          const image = element.querySelector('.bg-cover');
          if (!image || !getComputedStyle(image).backgroundImage.startsWith('url(')) found.push('no background image');
          // A price badge implies a crown; the reverse does not hold (a crown can come without a price).
          const price = element.querySelector('div[class*="card-footer"]')?.textContent?.trim() ?? '';
          if (price && !/^\d+$/.test(price)) found.push(`price "${price}" is not digits`);
          if (price && !element.querySelector('div[class*="card-header"] [style*="premium"]')) found.push('price without a crown');
          return found.map(problem => `card ${index} (${href}): ${problem}`);
        });
      },
      { source: this.hrefPattern.source, max: limit }
    );
    expect(problems).toEqual([]);
  }
}
