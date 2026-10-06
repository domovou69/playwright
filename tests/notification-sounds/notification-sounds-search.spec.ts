// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Search', { tag: ['@notification-sounds', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /notification-sounds', async ({ app }) => {
    await app.notificationSoundsListPage.open();
  });

  const searchTerms = [
    { term: 'ping', words: ['ping'] },
    { term: 'love song', words: ['love', 'song'] },
  ];

  for (const { term, words } of searchTerms) {
    test(`NS-02 Search by single and multi-word keywords (Notification Sounds scope): ${term}`, { tag: ['@smoke'] }, async ({ app, page }) => {
      await app.notificationSoundsListPage.search(term, 'Notification Sounds');

      await expect.poll(() => new URL(page.url()).searchParams.get('keyword')).toBe(term);
      expect(new URL(page.url()).pathname).toBe('/notification-sounds');
      await expect(app.notificationSoundsListPage.cardsAll.first()).toBeVisible();
      await expect(app.notificationSoundsListPage.searchInput).toHaveValue(term);
      await expect(app.notificationSoundsListPage.searchFilterSelected).toHaveText('Notification Sounds');
      await app.notificationSoundsListPage.validateSomeTitleContainsAnyWord(words);
    });
  }

  test('NS-03 Search with no matches shows the empty state', { tag: ['@regression'] }, async ({ app, page }) => {
    const nonsenseTerm = 'zzzxxxqqqnonexistent123456';
    await app.notificationSoundsListPage.search(nonsenseTerm, 'Notification Sounds');

    await expect(page).toHaveURL(new RegExp(`/notification-sounds\\?keyword=${nonsenseTerm}`));
    await expect(app.notificationSoundsListPage.noResultsHeading).toBeVisible();
    await expect(app.notificationSoundsListPage.cardsAll).toHaveCount(0);
    await expect(app.notificationSoundsListPage.main.locator('a[href^="/notification-sounds?keyword="]')).toHaveCount(0);
  });
});
