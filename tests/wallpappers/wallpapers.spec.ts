import { test } from '../../fixtures/test';
import { clearDownloadFolder } from '../../src/utils/helper';

test.describe('Wallpapers: Search, Filtering, and Free Downloading - Guest User', { tag: ['@wallpapers', '@guest'] }, () => {
  const searchTextSingleArr = ['sun', 'anime', 'space', 'messi', 'car', 'wall-e'];
  const searchTextMultipleArr = ['stone river', 'city tower car', 'space sun light'];

  test.beforeAll('Clear downloads folder', async () => {
    await clearDownloadFolder();
  });

  test.beforeEach('Open /wallpapers', async ({ app }) => {
    await app.wallpapersListPage.open();
  });

  test.describe('Search and Filtering', () => {
    test('allows users to search wallpapers by keywords', async ({ app }) => {
      // TC-01: Single and multiple words search (e.g. “sun” "mountains river") --- relevant results are displayed.
      // Single word search
      for (const text of searchTextSingleArr) {
        await app.wallpapersListPage.searchAndWaitForUpdate(text, 'Wallpapers');
        await app.wallpapersListPage.validateWallpapersToHaveLabels(text);
      }

      // Multiple word search
      for (const textMultiple of searchTextMultipleArr) {
        await app.wallpapersListPage.searchAndWaitForUpdate(textMultiple, 'Wallpapers');
        await app.wallpapersListPage.validateWallpapersToHaveLabels(textMultiple);
      }

      // TC-02: Auto load images on scroll down. --- previous wallpapers load should be preserved, relevant results should be added
      await app.wallpapersListPage.validateAutoLoadImagesOnScrollDown();
    });
  });

  test.describe('Downloading and Purchase - Guest User', { tag: ['@wallpapers', '@guest'] }, () => {
    test('allows users to download free wallpapers after ad', { tag: ['@download'] }, async ({ app }) => {
      // TC-10: Attempting to download a free image should show AD for 15 sec, then start downloading --- check image downloaded and not corrupted
      await app.wallpapersListPage.downloadFreeWallpapers('free', 1);
    });
  });
});
