import { expect, Locator } from '@playwright/test';

// Shared by the wallpapers and ringtones cards: a card is a link to `/<area>/<guid>` with a non-empty title and aria-label.
export async function validateCardLink(card: Locator, area: 'wallpapers' | 'ringtones', ariaLabelFor: (title: string) => string) {
  await expect(card).toHaveAttribute('href', new RegExp(`^/${area}/[a-f0-9-]{36}$`));
  await expect(card).not.toHaveAttribute('title', '');
  const title = (await card.getAttribute('title')) ?? '';
  await expect(card).toHaveAttribute('aria-label', ariaLabelFor(title));
}
