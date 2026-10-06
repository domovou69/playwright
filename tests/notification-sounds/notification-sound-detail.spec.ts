// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Notification Sound Detail Page', { tag: ['@notification-sounds', '@guest'] }, () => {
  test('NS-13 Free notification sound detail page', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Apply Price=Free and open the first card
    await app.notificationSoundsListPage.open();
    await app.notificationSoundsListPage.filtersBar.selectPrice('Free');
    await app.notificationSoundsListPage.cards.validateAllFree();
    const card = app.notificationSoundsListPage.cards.uncrowned.first();
    const href = await app.notificationSoundsListPage.cards.href(card);
    const title = await app.notificationSoundsListPage.cards.title(card);
    await app.notificationSoundsListPage.cards.open(card);

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await app.notificationSoundDetailsPage.validateFree(title);
  });

  test('NS-14 Tag chip on the detail page opens a keyword search', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. Open any card, click its first tag chip
    await app.notificationSoundsListPage.open();
    await app.notificationSoundsListPage.filtersBar.selectPrice('Free');
    await app.notificationSoundsListPage.cards.validateAllFree();
    await app.notificationSoundsListPage.cards.open(app.notificationSoundsListPage.cards.uncrowned.first());
    const tag = await app.notificationSoundDetailsPage.openFirstTag();

    await expect.poll(() => new URL(page.url()).pathname).toBe('/notification-sounds');
    await expect.poll(() => new URL(page.url()).searchParams.get('keyword')).toBe(tag);
    await expect(app.notificationSoundsListPage.searchInput).toHaveValue(tag);
    // A tag search can return fewer than 24 cards, so only that some render
    await app.notificationSoundsListPage.cards.validateFirst(24);
  });

  test('NS-15 Related section renders valid cards', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Open any card, scroll gradually to "Related"
    await app.notificationSoundsListPage.open();
    await app.notificationSoundsListPage.filtersBar.selectPrice('Free');
    await app.notificationSoundsListPage.cards.validateAllFree();
    const card = app.notificationSoundsListPage.cards.uncrowned.first();
    const href = await app.notificationSoundsListPage.cards.href(card);
    await app.notificationSoundsListPage.cards.open(card);

    await app.notificationSoundDetailsPage.scrollToRelated();
    await app.notificationSoundDetailsPage.validateRelated(href);
  });

  test('NS-16 Audio preview starts and stops from the list card and the detail player', { tag: ['@regression'] }, async ({ app, page }) => {
    // 1. On /notification-sounds?free=true play the first card
    await app.notificationSoundsListPage.open('/notification-sounds?free=true');
    await app.notificationSoundsListPage.cards.validateAllFree();
    const first = app.notificationSoundsListPage.cards.all.nth(0);
    const second = app.notificationSoundsListPage.cards.all.nth(1);
    const firstPlayer = app.notificationSoundsListPage.cards.player(first);
    const secondPlayer = app.notificationSoundsListPage.cards.player(second);
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
    await app.notificationSoundsListPage.cards.open(first);
    await app.notificationSoundDetailsPage.player.validatePlaying(false);
    await app.notificationSoundDetailsPage.player.toggle();
    await app.notificationSoundDetailsPage.player.validatePlaying(true);
    await app.notificationSoundDetailsPage.player.toggle();
    await app.notificationSoundDetailsPage.player.validatePlaying(false);
  });
});
