// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Ringtone Detail Page', { tag: ['@ringtones', '@guest'] }, () => {
  test('RT-14 Free ringtone detail page', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Apply Price=Free and open the first card without a crown
    await app.ringtonesListPage.open();
    await app.ringtonesListPage.filtersBar.selectPrice('Free');
    await app.ringtonesListPage.cards.validateAllFree();
    const card = app.ringtonesListPage.cards.uncrowned.first();
    const href = await app.ringtonesListPage.cards.href(card);
    const title = await app.ringtonesListPage.cards.title(card);
    await app.ringtonesListPage.cards.open(card);

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await app.ringtoneDetailsPage.validateFree(title);
  });

  test('RT-15 Tag chip on the detail page opens a keyword search', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Open any card, click its first tag chip
    await app.ringtonesListPage.open();
    await app.ringtonesListPage.filtersBar.selectPrice('Free');
    await app.ringtonesListPage.cards.validateAllFree();
    await app.ringtonesListPage.cards.open(app.ringtonesListPage.cards.uncrowned.first());
    const tag = await app.ringtoneDetailsPage.openFirstTag();

    await expect.poll(() => new URL(page.url()).pathname).toBe('/ringtones');
    await expect.poll(() => new URL(page.url()).searchParams.get('keyword')).toBe(tag);
    await expect(app.ringtonesListPage.searchInput).toHaveValue(tag);
    // A tag search can return few cards (10 for one tag), so only that some render
    await app.ringtonesListPage.cards.validateFirst(24);
  });

  test('RT-16 Related section renders valid cards', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Open any card, scroll gradually to "Related"
    await app.ringtonesListPage.open();
    await app.ringtonesListPage.filtersBar.selectPrice('Free');
    await app.ringtonesListPage.cards.validateAllFree();
    const card = app.ringtonesListPage.cards.uncrowned.first();
    const href = await app.ringtonesListPage.cards.href(card);
    await app.ringtonesListPage.cards.open(card);

    await app.ringtoneDetailsPage.scrollToRelated();
    await app.ringtoneDetailsPage.validateRelated(href);
  });

  test('RT-17 Audio preview starts and stops from the list card and the detail player', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. On /ringtones?free=true play the first card
    await app.ringtonesListPage.open('/ringtones?free=true');
    await app.ringtonesListPage.cards.validateAllFree();
    const first = app.ringtonesListPage.cards.all.nth(0);
    const second = app.ringtonesListPage.cards.all.nth(1);
    const firstPlayer = app.ringtonesListPage.cards.player(first);
    const secondPlayer = app.ringtonesListPage.cards.player(second);
    const listUrl = page.url();

    await firstPlayer.validatePlaying(false);
    await firstPlayer.toggle();
    await firstPlayer.validatePlaying(true);
    await expect(page).toHaveURL(listUrl);
    await firstPlayer.validateProgressGrows();
    await firstPlayer.toggle();
    await firstPlayer.validatePlaying(false);

    // 3. Start card 2 while card 1 plays
    await firstPlayer.toggle();
    await firstPlayer.validatePlaying(true);
    await secondPlayer.toggle();
    await secondPlayer.validatePlaying(true);
    await firstPlayer.validatePlaying(false);
    await secondPlayer.toggle();
    await secondPlayer.validatePlaying(false);

    // 2. Open the card and repeat on the detail player
    await app.ringtonesListPage.cards.open(first);
    await app.ringtoneDetailsPage.player.validatePlaying(false);
    await app.ringtoneDetailsPage.player.toggle();
    await app.ringtoneDetailsPage.player.validatePlaying(true);
    await app.ringtoneDetailsPage.player.toggle();
    await app.ringtoneDetailsPage.player.validatePlaying(false);
  });
});
