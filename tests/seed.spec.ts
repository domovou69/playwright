import { test } from '../fixtures/test';

test.describe('Wallpapers seed', () => {
  test('seed', async ({ app }) => {
    await app.wallpapersListPage.open();
  });
});
