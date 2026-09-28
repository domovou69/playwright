import { test } from '../fixtures/test';

test.describe('Wallpapers seed', { tag: ['@wallpapers', '@guest', '@smoke'] }, () => {
  test('seed', async ({ app }) => {
    await app.wallpapersListPage.open();
  });
});
