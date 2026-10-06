// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test } from '../../fixtures/test';

test.describe('Infinite Scroll and Load More', { tag: ['@notification-sounds', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /notification-sounds', async ({ app }) => {
    await app.notificationSoundsListPage.open();
  });

  test('NS-04 Auto-load on scroll preserves previous results', { tag: ['@smoke'] }, async ({ app }) => {
    // 1-2. "Load more" is absent at first; each scroll round appends cards until "Load more" is visible and enabled
    await app.notificationSoundsListPage.scroll.validateAutoLoadUntilLoadMore();
  });

  test('NS-05 "Load more" loads more cards and re-enables auto-loading', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Scroll until "Load more" is visible, click it: more cards, previous hrefs preserved, no duplicates
    const hrefsBeforeLoadMore = await app.notificationSoundsListPage.scroll.validateAutoLoadUntilLoadMore();
    const hrefsAfterLoadMore = await app.notificationSoundsListPage.scroll.validateLoadMoreAppends(hrefsBeforeLoadMore);

    // 2. Scroll a few more times: auto-loading works again, every round appends. Stop here, do not test for an end of results.
    await app.notificationSoundsListPage.scroll.validateScrollAppends(hrefsAfterLoadMore, 3);
  });
});
