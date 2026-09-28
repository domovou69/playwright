// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Search', () => {
  test.beforeEach('Open unfiltered /wallpapers', async ({ app }) => {
    await app.wallpapersListPage.open();
  });

  test('WP-03 Search with no matches shows the empty state', { tag: ['@wallpapers', '@guest', '@regression'] }, async ({ app, page }) => {
    // 1. Search (All filter) for a nonsense term, e.g. zzzxxxqqqnonexistent123456
    // Note: the plan's "Wallpapers filter" wording matches this page (/find/<term>, filter "All"),
    // which is the one that actually shows "Oops, couldn't find it" with suggested keywords - the
    // "Wallpapers"-filter search (?keyword=<term>) has a different, plain empty state with none.
    const nonsenseTerm = 'zzzxxxqqqnonexistent123456';
    await app.wallpapersListPage.search(nonsenseTerm, 'All');

    await expect(page).toHaveURL(new RegExp(`find/${nonsenseTerm}`));
    await expect(app.wallpapersListPage.noResultsHeading).toBeVisible();
    await expect(app.wallpapersListPage.cardsAll).toHaveCount(0);

    // 2. Click the first suggested keyword
    const firstSuggestion = app.wallpapersListPage.suggestedKeywordLinks.first();
    await expect(firstSuggestion).toBeVisible();
    const suggestedKeyword = await firstSuggestion.getAttribute('href');
    await firstSuggestion.click();

    await expect(page).toHaveURL(new RegExp(suggestedKeyword!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await expect(app.wallpapersListPage.cardsAll.first()).toBeVisible();
    expect(await app.wallpapersListPage.cardsAll.count()).toBeGreaterThan(0);
  });

  test('WP-05 Cancel clears the search input', { tag: ['@wallpapers', '@guest', '@regression'] }, async ({ app }) => {
    // 1. Search for mountains (Wallpapers filter)
    await app.wallpapersListPage.search('mountains', 'Wallpapers');
    await expect(app.wallpapersListPage.searchCancelBtn).toBeVisible();

    // 2. Click cancel
    await app.wallpapersListPage.clickCancelSearch();
    await expect(app.wallpapersListPage.searchInput).toHaveValue('');
    await expect(app.wallpapersListPage.searchCancelBtn).not.toBeAttached();
  });

  test(
    'WP-06 Search filter dropdown defaults to "All" and reflects the selection',
    { tag: ['@wallpapers', '@guest', '@regression'] },
    async ({ app }) => {
      // 1. Open the search filter dropdown
      await app.wallpapersListPage.clickSearchFilter();
      await app.wallpapersListPage.validateSearchDropdownSelection('All');
      await app.wallpapersListPage.clickSearchFilter();

      // 2. Select "Wallpapers"
      await app.wallpapersListPage.selectSearchFilter('Wallpapers');
      await app.wallpapersListPage.clickSearchFilter();
      await app.wallpapersListPage.validateSearchDropdownSelection('Wallpapers');
    }
  );
});
