// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

type PurchaseVariant = {
  name: string;
  path: string;
  closeMethod: 'Cancel' | 'Escape';
};

// Price 10 is left out on purpose: it is the NS-19 bug candidate (Download instead of Buy).
const variants: PurchaseVariant[] = [
  { name: 'Lowest price', path: '/notification-sounds?minPrice=11&sort=PRICE_ASC', closeMethod: 'Cancel' },
  { name: 'Highest price', path: '/notification-sounds?paid=true&sort=PRICE_DESC', closeMethod: 'Escape' },
];

test.describe('Purchase (Guest)', { tag: ['@notification-sounds', '@guest'] }, () => {
  for (const variant of variants) {
    test(
      `NS-18 ${variant.name} premium notification sound above 10 credits shows its price and the purchase gate`,
      { tag: ['@smoke'] },
      async ({ app, page }) => {
        await app.notificationSoundsListPage.open(variant.path);
        await app.notificationSoundsListPage.cards.validateAllPriced({ min: 11 });

        // 1. Pick the card, record its price, open it
        const card = app.notificationSoundsListPage.cards.priced.first();
        const price = await app.notificationSoundsListPage.cards.price(card);
        expect(Number(price)).toBeGreaterThan(10);
        await app.notificationSoundsListPage.cards.open(card);
        await app.notificationSoundDetailsPage.validatePremiumGate(price);
        const detailUrl = page.url();

        // 2. Click "Buy for Ƶ<price>"
        await app.notificationSoundDetailsPage.clickBuy();
        await app.modalBuyPage.validatePurchaseGate(price);

        // 3. Close the dialog
        await app.modalBuyPage.close(variant.closeMethod);
        await expect(page).toHaveURL(detailUrl);
        await app.notificationSoundDetailsPage.validatePremiumGate(price);
      }
    );
  }

  test('NS-20 Opening a premium notification sound by direct URL keeps the gate', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Take the href of the first card from minPrice=11 sorted by price, then open it directly
    await app.notificationSoundsListPage.open('/notification-sounds?minPrice=11&sort=PRICE_ASC');
    await app.notificationSoundsListPage.cards.validateAllPriced({ min: 11 });
    const card = app.notificationSoundsListPage.cards.priced.first();
    const href = await app.notificationSoundsListPage.cards.href(card);
    const price = await app.notificationSoundsListPage.cards.price(card);

    await app.notificationSoundsListPage.open(href);
    await app.notificationSoundDetailsPage.validatePremiumGate(price);
  });
});
