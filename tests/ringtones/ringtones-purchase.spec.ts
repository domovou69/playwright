// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

type PurchaseVariant = {
  name: string;
  path: string;
  closeMethod: 'Cancel' | 'Escape';
};

// Price 10 is left out on purpose: it is the RT-20 bug candidate (Download instead of Buy).
const variants: PurchaseVariant[] = [
  { name: 'Lowest price', path: '/ringtones?minPrice=11&sort=PRICE_ASC', closeMethod: 'Cancel' },
  { name: 'Highest price', path: '/ringtones?paid=true&sort=PRICE_DESC', closeMethod: 'Escape' },
];

test.describe('Purchase (Guest)', { tag: ['@ringtones', '@guest'] }, () => {
  for (const variant of variants) {
    test(
      `RT-19 ${variant.name} premium ringtone above 10 credits shows its price and the purchase gate`,
      { tag: ['@smoke'] },
      async ({ app, page }) => {
        await app.ringtonesListPage.open(variant.path);
        await app.ringtonesListPage.cards.validateAllPriced({ min: 11 });

        // 1. Pick the card, record its price, open it
        const card = app.ringtonesListPage.cards.priced.first();
        const price = await app.ringtonesListPage.cards.price(card);
        expect(Number(price)).toBeGreaterThan(10);
        await app.ringtonesListPage.cards.open(card);
        await app.ringtoneDetailsPage.validatePremiumGate(price);
        const detailUrl = page.url();

        // 2. Click "Buy for Ƶ<price>"
        await app.ringtoneDetailsPage.clickBuy();
        await app.modalBuyPage.validatePurchaseGate(price);

        // 3. Close the dialog
        await app.modalBuyPage.close(variant.closeMethod);
        await expect(page).toHaveURL(detailUrl);
        await app.ringtoneDetailsPage.validatePremiumGate(price);
      }
    );
  }

  test('RT-21 Opening a premium ringtone by direct URL keeps the gate', { tag: ['@regression'] }, async ({ app }) => {
    // 1. Take the href of the first card from minPrice=11 sorted by price, then open it directly
    await app.ringtonesListPage.open('/ringtones?minPrice=11&sort=PRICE_ASC');
    await app.ringtonesListPage.cards.validateAllPriced({ min: 11 });
    const card = app.ringtonesListPage.cards.priced.first();
    const href = await app.ringtonesListPage.cards.href(card);
    const price = await app.ringtonesListPage.cards.price(card);

    await app.ringtonesListPage.open(href);
    await app.ringtoneDetailsPage.validatePremiumGate(price);
  });
});
