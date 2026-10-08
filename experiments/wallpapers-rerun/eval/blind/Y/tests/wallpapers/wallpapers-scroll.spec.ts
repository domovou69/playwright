import { test } from '../../fixtures/test';

test.describe('Wallpapers infinite scroll', { tag: ['@wallpapers', '@guest'] }, () => {
  test('WP-05 Auto-load on scroll preserves previous results', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    const initial = await app.wallpapersListPage.cards.hrefs();
    await app.wallpapersListPage.cards.validateLoadMoreHidden();

    await app.wallpapersListPage.cards.scrollUntilLoadMoreVisible();

    await app.wallpapersListPage.cards.validateAppended(initial);
    await app.wallpapersListPage.cards.validateLoadMoreReady();
  });

  test('WP-06 "Load more" loads more cards and re-enables auto-loading', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.cards.scrollUntilLoadMoreVisible();
    let hrefs = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.cards.clickLoadMore();
    hrefs = await app.wallpapersListPage.cards.validateAppended(hrefs);

    for (let round = 0; round < 3; round++) {
      await app.wallpapersListPage.cards.scrollToLastCard();
      hrefs = await app.wallpapersListPage.cards.validateAppended(hrefs);
    }
  });
});
