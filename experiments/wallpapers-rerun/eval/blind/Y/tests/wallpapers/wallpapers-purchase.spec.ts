import { test } from '../../fixtures/test';

// Price 10 is left out on purpose: it offers "Download" instead of "Buy for" (WP-22, not filed).
const PRICE_VARIANTS = [
  { title: 'lowest price', start: '/wallpapers?minPrice=11', sort: 'Price: Low to High', order: 'asc', close: 'cancel' },
  { title: 'highest price', start: '/wallpapers?paid=true', sort: 'Price: High to Low', order: 'desc', close: 'escape' },
] as const;

test.describe('Wallpapers purchase gate', { tag: ['@wallpapers', '@guest'] }, () => {
  for (const row of PRICE_VARIANTS) {
    test(`WP-21 Premium wallpaper shows its price and the purchase gate (${row.title})`, { tag: '@smoke' }, async ({ app }) => {
      await app.wallpapersListPage.open(row.start);
      await app.wallpapersListPage.filtersBar.applySort(row.sort);
      await app.wallpapersListPage.cards.validatePriced(24, row.order, 11);
      const card = await app.wallpapersListPage.cards.firstPriced();
      await app.wallpapersListPage.cards.open(card.href);

      await app.wallpaperDetailPage.validatePremiumPrice(card.price);

      await app.wallpaperDetailPage.clickBuy();

      await app.buyModal.validateBuyPrompt(card.price);

      await app.buyModal.close(row.close);

      await app.buyModal.validateClosed();
      await app.wallpapersListPage.validateUrl(card.href);
      await app.wallpaperDetailPage.validatePremiumPrice(card.price);
    });
  }

  test('WP-23 Opening a premium wallpaper by direct URL keeps the gate', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open('/wallpapers?minPrice=11');
    await app.wallpapersListPage.filtersBar.applySort('Price: Low to High');
    await app.wallpapersListPage.cards.validatePriced(24, 'asc', 11);
    const card = await app.wallpapersListPage.cards.firstPriced();
    await app.wallpapersListPage.cards.open(card.href);
    await app.wallpaperDetailPage.validatePremiumPrice(card.price);

    await app.wallpaperDetailPage.open(card.href);

    await app.wallpaperDetailPage.validatePremiumPrice(card.price);
    await app.wallpaperDetailPage.clickBuy();
    await app.buyModal.validateBuyPrompt(card.price);
  });
});
