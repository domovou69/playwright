// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test } from '../../fixtures/test';

test.describe('Infinite Scroll and Load More', { tag: ['@wallpapers', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /wallpapers', async ({ app }) => {
    await app.wallpapersListPage.open();
  });

  test('WP-07 Auto-load on scroll preserves previous results', { tag: ['@smoke'] }, async ({ app }) => {
    await app.wallpapersListPage.validateAutoLoadImagesOnScrollDown();
  });

  test('WP-08 "Load more" loads more cards', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Scroll until "Load more" is visible and enabled
    await app.wallpapersListPage.validateAutoLoadImagesOnScrollDown();

    // 2. Click "Load more": more cards, previous hrefs preserved in order, no duplicates. Stop here, loading is infinite past this point
    await app.wallpapersListPage.validateLoadMoreAppends(await app.wallpapersListPage.getCardsHref());
  });
});
