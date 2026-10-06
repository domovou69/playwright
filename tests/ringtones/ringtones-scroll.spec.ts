// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test } from '../../fixtures/test';

test.describe('Infinite Scroll and Load More', { tag: ['@ringtones', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /ringtones', async ({ app }) => {
    await app.ringtonesListPage.open();
  });

  test('RT-04 Auto-load on scroll preserves previous results', { tag: ['@smoke'] }, async ({ app }) => {
    // 1-2. "Load more" is absent at first; each scroll round appends cards until "Load more" is visible and enabled
    await app.ringtonesListPage.scroll.validateAutoLoadUntilLoadMore();
  });

  test('RT-05 "Load more" loads more cards and re-enables auto-loading', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Scroll until "Load more" is visible, click it: more cards, previous hrefs preserved, no duplicates
    const hrefsBeforeLoadMore = await app.ringtonesListPage.scroll.validateAutoLoadUntilLoadMore();
    const hrefsAfterLoadMore = await app.ringtonesListPage.scroll.validateLoadMoreAppends(hrefsBeforeLoadMore);

    // 2. Scroll a few more times: auto-loading works again, every round appends. Stop here, do not test for an end of results.
    await app.ringtonesListPage.scroll.validateScrollAppends(hrefsAfterLoadMore, 3);
  });
});
