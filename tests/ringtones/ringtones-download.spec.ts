// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test } from '../../fixtures/test';

test.describe('Download (Guest)', { tag: ['@ringtones', '@guest'] }, () => {
  test('RT-18 Free ringtone downloads after the countdown', { tag: ['@smoke', '@download'] }, async ({ app }, testInfo) => {
    // 1. Apply Price=Free, open the first card without a crown
    await app.ringtonesListPage.open();
    await app.ringtonesListPage.filtersBar.selectPrice('Free');
    await app.ringtonesListPage.cards.validateAllFree();
    await app.ringtonesListPage.cards.open(app.ringtonesListPage.cards.uncrowned.first());

    // 2. Click Download and wait for the file (the countdown dialog and the saved .mp3 are checked in the flow)
    await app.ringtoneDetailsPage.downloadFlow.downloadFree(testInfo.outputPath('ringtone.mp3'));
  });
});
