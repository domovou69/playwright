import { test, expect } from '../fixtures/test';

test.describe('Wallpapers seed', { tag: ['@wallpapers', '@guest'] }, () => {
  test('seed', { tag: ['@regression'] }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await expect(app.wallpapersListPage.wallpaperTitle).toBeVisible();
  });
});
