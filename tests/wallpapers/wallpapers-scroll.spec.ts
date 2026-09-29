// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { hasUniqueValues } from '../../src/utils/helper';

test.describe('Infinite Scroll and Load More', { tag: ['@wallpapers', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /wallpapers', async ({ app }) => {
    await app.wallpapersListPage.open();
  });

  test('WP-07 Auto-load on scroll preserves previous results', { tag: ['@smoke'] }, async ({ app }) => {
    await app.wallpapersListPage.validateAutoLoadImagesOnScrollDown();
  });

  test('WP-08 "Load more" loads more cards', { tag: ['@regression'] }, async ({ app }) => {
    const { wallpapersListPage } = app;

    // 1. Scroll until "Load more" is visible and enabled
    await wallpapersListPage.validateAutoLoadImagesOnScrollDown();
    await expect(wallpapersListPage.loadMoreBtn).toBeVisible();
    await expect(wallpapersListPage.loadMoreBtn).toBeEnabled();

    // 2. Record card hrefs and click "Load more"
    const hrefsBeforeLoadMore = await wallpapersListPage.getCardsHref();
    const countBeforeLoadMore = hrefsBeforeLoadMore.length;
    await wallpapersListPage.loadMoreBtn.click();

    // expect: card count increases - stop here, loading is infinite past this point
    await expect.poll(() => wallpapersListPage.cardsAll.count(), { timeout: 10000, intervals: [500] }).toBeGreaterThan(countBeforeLoadMore);

    // expect: all previously recorded hrefs are still present, in the same order, no duplicates
    const hrefsAfterLoadMore = await wallpapersListPage.getCardsHref();
    wallpapersListPage.compareCardsHrefArrays(hrefsAfterLoadMore, hrefsBeforeLoadMore);
    expect(hasUniqueValues(hrefsAfterLoadMore)).toBe(true);
  });
});
