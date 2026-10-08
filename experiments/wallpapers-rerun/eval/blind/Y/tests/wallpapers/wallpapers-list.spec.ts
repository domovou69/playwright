import { test } from '../../fixtures/test';

test.describe('Wallpapers list', { tag: ['@wallpapers', '@guest'] }, () => {
  test('WP-01 List page loads with header, filter bar and valid cards', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.validateUrl('/wallpapers');
    await app.wallpapersListPage.mainHeader.validateHeading(/download hd phone wallpapers for free/i);
    await app.wallpapersListPage.header.validateDefaultState();
    await app.wallpapersListPage.filtersBar.validateDefaultState();
    await app.wallpapersListPage.cards.validateFirst(24);
    await app.wallpapersListPage.cards.validateLoadMoreHidden();
    await app.wallpapersListPage.footer.validateVisible();
  });
});
