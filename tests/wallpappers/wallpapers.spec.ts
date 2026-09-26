import { test, expect } from '../../fixtures/test';
import { clearDownloadFolder } from '../../src/utils/helper';
import { tags } from '../../src/utils/tags';

test.describe('Wallpapers: Search, Filtering, and Free Downloading - Guest User', { tag: [tags.WALLPAPERS, tags.GUEST] }, () => {
  const searchTextSingle = 'mountains';
  const searchTextSingleArr = ['sun', 'anime', 'space', 'messi', 'car', 'wall-e'];
  const searchTextMultipleArr = ['stone river', 'city tower car', 'space sun light'];

  test.beforeAll('Clear downloads folder', async () => {
    await clearDownloadFolder();
  });

  test.beforeEach('Go to uri /wallpapers and close prompt', async ({ page }) => {
    await page.goto('/wallpapers');
    await page.getByRole('button', { name: 'Reject Optional Cookies' }).click();
    await page.getByRole('button', { name: 'Reject Optional Cookies' }).waitFor({ state: 'detached' });
  });

  test.describe('Search and Filtering', () => {
    test('allows users to search wallpapers by keywords', async ({ app }) => {
      // TC-01: Single and multiple words search (e.g. “sun” "mountains river") --- relevant results are displayed.
      // Single word search
      for (const text of searchTextSingleArr) {
        await app.wallpapersListPage.search(text, 'Wallpapers');
        await app.wallpapersListPage.validateWallpapersToHaveLabels(text);
      }

      // Multiple word search
      for (const textMultiple of searchTextMultipleArr) {
        await app.wallpapersListPage.search(textMultiple, 'Wallpapers');
        await app.wallpapersListPage.validateWallpapersToHaveLabels(textMultiple);
      }

      // TC-02: Auto load images on scroll down. --- previous wallpapers load should be preserved, relevant results should be added
      await app.wallpapersListPage.validateAutoLoadImagesOnScrollDown();
    });

    test('allows filtering wallpapers by category, color, tags, price and sort by', async ({ app }) => {
      // TC-03: Apply filter by category ("nature") --- validate free and premium images
      await app.wallpapersListPage.search(searchTextSingle, 'Wallpapers');
      const cardsList1 = await app.wallpapersListPage.getCardsHref();
      await app.wallpapersListPage.filterByCategories(['Nature']);
      const cardsList2 = await app.wallpapersListPage.getCardsHref();
      expect(cardsList2).not.toEqual(cardsList1);
      await app.wallpapersListPage.validateWallpapersToHaveLabels(searchTextSingle);

      // TC-04: Filtering by color ("pink") --- validate free and premium images
      await app.wallpapersListPage.filterByColor(['Pink']);
      const cardsList3 = await app.wallpapersListPage.getCardsHref();
      expect(cardsList3).not.toEqual(cardsList2);
      await app.wallpapersListPage.validateWallpapersToHaveLabels(searchTextSingle);

      // TC-05: Filter by tags ("fall") --- validate free and premium images
      await app.wallpapersListPage.filterByTag(['fall']);
      const cardsList4 = await app.wallpapersListPage.getCardsHref();
      expect(cardsList4).not.toEqual(cardsList3);
      await app.wallpapersListPage.validateWallpapersToHaveLabels(searchTextSingle);

      // TC-06: Filter by price (free vs premium) --- only relevant images are displayed
      await app.wallpapersListPage.filterByPrice(['Free']);
      const cardsList5 = await app.wallpapersListPage.getCardsHref();
      expect(cardsList5).not.toEqual(cardsList4);
      await app.wallpapersListPage.validateWallpapersToHaveLabels(searchTextSingle);
      await app.wallpapersListPage.validateCardExistance('Free', true);
      await app.wallpapersListPage.validateCardExistance('Paid', false);

      // TC-07: Filter by sort by --- only relevant images are displayed
      await app.wallpapersListPage.filterBySortBy('Most popular');
      const cardsList6 = await app.wallpapersListPage.getCardsHref();
      expect(cardsList6).not.toEqual(cardsList5);
      await app.wallpapersListPage.validateWallpapersToHaveLabels(searchTextSingle);
      await app.wallpapersListPage.validateCardExistance('Free', true);
      await app.wallpapersListPage.validateCardExistance('Paid', false);

      // TC-08: Apply multiple filters at once > reset filters --- all filters removed
      await app.wallpapersListPage.clickResetAllFilters();
      const cardsList7 = await app.wallpapersListPage.getCardsHref();
      expect(cardsList7).not.toEqual(cardsList6);
    });
  });

  test.describe('Downloading and Purchase - Guest User', { tag: [tags.WALLPAPERS, tags.GUEST] }, () => {
    test('allows users to download free wallpapers after ad', { tag: [tags.DOWNLOAD] }, async ({ app }) => {
      // TC-10: Attempting to download a free image should show AD for 15 sec, then start downloading --- check image downloaded and not corrupted
      await app.wallpapersListPage.downloadFreeWallpapers('free', 1);
    });

    test('prevents downloading premium wallpapers without purchase', async ({ app }) => {
      // TC-11: prevents downloading premium wallpapers without purchase
      await app.wallpapersListPage.selectCardByType('Paid');
      // await expect(app.wallpaperDetailsPage.downloadBtn).not.toBeAttached();
      await app.wallpaperDetailsPage.clickDownload();
      await app.modalBuyPage.validateModalDialog();
      await app.modalBuyPage.clickClose();
    });
  });
});
