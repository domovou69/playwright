// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { tags } from '../../src/utils/tags';

test.describe('Wallpaper Detail Page', () => {
  test('WP-24 Free wallpaper detail page', { tag: [tags.WALLPAPERS, tags.GUEST, tags.REGRESSION] }, async ({ app, page }) => {
    // 1. On /wallpapers, apply Price=Free filter, then open the first card
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filterByPrice(['Free']);
    const card = app.wallpapersListPage.cardsFree.first();
    const cardHref = await app.wallpapersListPage.getCardHref(card);
    const cardTitle = await app.wallpapersListPage.getCardTitle(card);
    await app.wallpapersListPage.selectCard(card);

    // 2. Assert: URL equals the card's href, the page's H1 equals the card's title attribute
    await expect(page).toHaveURL(new RegExp(`${cardHref}$`));
    await expect(page.getByRole('heading', { level: 1, name: cardTitle })).toBeVisible();

    // 3. Assert: artist name, downloads count, and tag chips are shown on the page
    await expect(app.wallpaperDetailsPage.artistLink).toBeVisible();
    await expect(app.wallpaperDetailsPage.downloads).toBeVisible();
    await expect(app.wallpaperDetailsPage.tagChips.first()).toBeVisible();

    // 4. Assert: no Premium badge and no price text is shown; download button is visible/enabled, buy button is not attached
    await expect(app.wallpaperDetailsPage.premiumBadge).toBeHidden();
    await expect(app.wallpaperDetailsPage.buyBtn).not.toBeAttached();
    await expect(app.wallpaperDetailsPage.downloadBtn).toBeVisible();
    await expect(app.wallpaperDetailsPage.downloadBtn).toBeEnabled();
  });

  test('WP-26 Tag chip on the detail page opens a keyword search', { tag: [tags.WALLPAPERS, tags.GUEST, tags.REGRESSION] }, async ({ app, page }) => {
    // 1. Open any card's detail page (Free is simplest, reuse the same open-first-card approach as WP-24)
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filterByPrice(['Free']);
    const card = app.wallpapersListPage.cardsFree.first();
    await app.wallpapersListPage.selectCard(card);

    // 2. Click the first tag chip
    const firstTagChip = app.wallpaperDetailsPage.tagChips.first();
    const tagText = (await firstTagChip.textContent())?.trim() ?? '';
    await firstTagChip.click();

    // 3. Assert: URL contains keyword=<tag text>, and cards render on the resulting page
    await expect(page).toHaveURL(new RegExp(`keyword=${tagText}`));
    const resultCards = app.wallpapersListPage.cardsAll;
    await expect(resultCards.first()).toBeVisible();
    expect(await resultCards.count()).toBeGreaterThan(0);
  });

  test('WP-27 Related section renders valid cards', { tag: [tags.WALLPAPERS, tags.GUEST, tags.REGRESSION] }, async ({ app }) => {
    // 1. Open any card's detail page, scroll down to a "Related" section
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filterByPrice(['Free']);
    const card = app.wallpapersListPage.cardsFree.first();
    await app.wallpapersListPage.selectCard(card);

    const relatedHeading = app.wallpaperDetailsPage.relatedHeading;
    await relatedHeading.scrollIntoViewIfNeeded();

    // 2. Assert: the Related heading and its cards are visible, cards count > 0
    const relatedCards = app.wallpaperDetailsPage.relatedCards;
    await expect(relatedHeading).toBeVisible();
    await expect(relatedCards.first()).toBeVisible();
    expect(await relatedCards.count()).toBeGreaterThan(0);

    // 3. For the first 3 related cards, assert the same basic invariants WP-01 already checks for list cards
    const cardsToCheck = Math.min(3, await relatedCards.count());
    for (let i = 0; i < cardsToCheck; i++) {
      await app.wallpapersListPage.validateCommonWallpaper(relatedCards.nth(i));
    }
  });
});
