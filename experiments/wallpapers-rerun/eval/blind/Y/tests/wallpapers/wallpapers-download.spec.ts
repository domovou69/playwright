import { test } from '../../fixtures/test';

test.describe('Wallpapers download', { tag: ['@wallpapers', '@guest'] }, () => {
  test('WP-20 Free wallpaper downloads after the countdown', { tag: ['@smoke', '@download'] }, async ({ app }, testInfo) => {
    test.slow();
    await app.wallpapersListPage.open('/wallpapers?free=true');
    const card = await app.wallpapersListPage.cards.firstWithoutCrown();
    await app.wallpapersListPage.cards.open(card.href);
    await app.wallpaperDetailPage.validateFree();

    await app.wallpapersListPage.downloadFlow.download(app.wallpaperDetailPage.downloadButton, testInfo.outputPath('wallpaper.jpg'));

    await app.buyModal.validateUnlockAbsent();
    await app.wallpapersListPage.downloadFlow.validateClosed();
  });
});
