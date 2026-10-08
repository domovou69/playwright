import { test } from '../../fixtures/test';

test.describe('Wallpaper detail page', { tag: ['@wallpapers', '@guest'] }, () => {
  test('WP-16 Free wallpaper detail page', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open('/wallpapers?free=true');
    const card = await app.wallpapersListPage.cards.firstWithoutCrown();

    await app.wallpapersListPage.cards.open(card.href);

    await app.wallpaperDetailPage.validateOpened(card.href, card.title);
    await app.wallpaperDetailPage.validateDetails();
    await app.wallpaperDetailPage.validatePreviewLoaded();
    await app.wallpaperDetailPage.validateFree();
  });

  test('WP-17 Tag chip on the detail page opens a keyword search', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.cards.openFirst();
    const tag = await app.wallpaperDetailPage.firstKeyword();

    await app.wallpaperDetailPage.openFirstKeyword();

    await app.wallpapersListPage.validateKeywordSearch(tag);
    await app.wallpapersListPage.cards.validateFirst(1);
  });

  test('WP-18 Related section renders valid cards', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    const href = await app.wallpapersListPage.cards.openFirst();

    await app.wallpaperDetailPage.scrollToRelated();

    await app.wallpaperDetailPage.related.validateFirst(24);
    await app.wallpaperDetailPage.related.validateNotLinkedTo(href);
  });

  test('WP-19 Share button opens the share dialog', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    const href = await app.wallpapersListPage.cards.openFirst();

    await app.wallpaperDetailPage.openShare();

    await app.wallpaperDetailPage.validateShareOpened(href);

    await app.wallpaperDetailPage.closeShare();

    await app.wallpaperDetailPage.validateShareClosed(href);
  });

  test('WP-25 Unknown wallpaper shows the not-found page', { tag: '@regression' }, async ({ app }) => {
    const status = await app.wallpapersNotFoundPage.open('/wallpapers/00000000-0000-0000-0000-000000000000');

    await app.wallpapersNotFoundPage.validateNotFound(status);
  });
});
