// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Search', { tag: ['@ringtones', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /ringtones', async ({ app }) => {
    await app.ringtonesListPage.open();
  });

  const searchTerms = [
    { term: 'piano', words: ['piano'] },
    { term: 'love song', words: ['love', 'song'] },
  ];

  for (const { term, words } of searchTerms) {
    test(`RT-02 Search by single and multi-word keywords (Ringtones scope): ${term}`, { tag: ['@smoke'] }, async ({ app, page }) => {
      await app.ringtonesListPage.search(term, 'Ringtones');

      await expect.poll(() => new URL(page.url()).searchParams.get('keyword')).toBe(term);
      expect(new URL(page.url()).pathname).toBe('/ringtones');
      await expect(app.ringtonesListPage.cardsAll.first()).toBeVisible();
      await expect(app.ringtonesListPage.searchInput).toHaveValue(term);
      await expect(app.ringtonesListPage.searchFilterSelected).toHaveText('Ringtones');
      await app.ringtonesListPage.validateSomeTitleContainsAnyWord(words);
    });
  }

  test('RT-03 Search with no matches shows the empty state', { tag: ['@regression'] }, async ({ app, page }) => {
    const nonsenseTerm = 'zzzxxxqqqnonexistent123456';
    await app.ringtonesListPage.search(nonsenseTerm, 'Ringtones');

    await expect(page).toHaveURL(new RegExp(`/ringtones\\?keyword=${nonsenseTerm}`));
    await expect(app.ringtonesListPage.noResultsHeading).toBeVisible();
    await expect(app.ringtonesListPage.cardsAll).toHaveCount(0);
    await expect(app.ringtonesListPage.main.locator('a[href^="/ringtones?keyword="]')).toHaveCount(0);
  });
});
