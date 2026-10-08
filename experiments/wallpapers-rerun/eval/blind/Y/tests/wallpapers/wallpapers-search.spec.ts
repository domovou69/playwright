import { test } from '../../fixtures/test';

const keywordSearches = [
  { term: 'dragon', words: ['dragon'] },
  { term: 'dark forest', words: ['dark', 'forest'] },
];

test.describe('Wallpapers search', { tag: ['@wallpapers', '@guest'] }, () => {
  for (const { term, words } of keywordSearches) {
    test(`WP-02 Search by single and multi-word keywords (Wallpapers scope): ${term}`, { tag: '@smoke' }, async ({ app }) => {
      await app.wallpapersListPage.open();
      await app.wallpapersListPage.header.selectScope('Wallpapers');
      await app.wallpapersListPage.header.search(term);

      await app.wallpapersListPage.validateUrl('/wallpapers', { keyword: term });
      await app.wallpapersListPage.mainHeader.validateHeading(new RegExp(`^${term} download hd phone wallpapers for free`, 'i'));
      await app.wallpapersListPage.cards.validateFirst(24);
      await app.wallpapersListPage.header.validateSearchState(term, 'Wallpapers');
      await app.wallpapersListPage.cards.validateAnyTitleContains(words);
    });
  }

  test('WP-03 Search with no matches shows the empty state', { tag: '@regression' }, async ({ app }) => {
    const term = 'zzzxxxqqqnonexistent123456';
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.header.selectScope('Wallpapers');
    await app.wallpapersListPage.header.search(term);

    await app.wallpapersListPage.validateUrl('/wallpapers', { keyword: term });
    await app.wallpapersListPage.validateNoResults();
    await app.wallpapersListPage.header.validateScope('Wallpapers');
  });

  test('WP-04 Search with the default "All" scope opens the global results page', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.header.validateScope('All');
    await app.wallpapersListPage.header.search('anime');

    await app.wallpapersListPage.validateUrl('/find/anime');
    await app.wallpapersListPage.cards.validateFirst(24);
    await app.wallpapersListPage.header.validateSearchState('anime', 'All');
  });
});
