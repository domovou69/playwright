// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test } from '../../fixtures/test';

test.describe('Download (Guest)', { tag: ['@notification-sounds', '@guest'] }, () => {
  test('NS-17 Free notification sound downloads after the countdown', { tag: ['@smoke', '@download'] }, async ({ app }, testInfo) => {
    // 1. Apply Price=Free, open the first card without a crown
    await app.notificationSoundsListPage.open();
    await app.notificationSoundsListPage.filtersBar.selectPrice('Free');
    await app.notificationSoundsListPage.cards.validateAllFree();
    await app.notificationSoundsListPage.cards.open(app.notificationSoundsListPage.cards.uncrowned.first());

    // 2. Click Download and wait for the file (the countdown dialog and the saved .mp3 are checked in the flow)
    await app.notificationSoundDetailsPage.downloadFlow.downloadFree(testInfo.outputPath('notification-sound.mp3'));
  });
});
