// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import { tags } from '../../src/utils/tags';
import type { AppPageObjects } from '../../pages/AppPageObjects';
import type { Locator } from '@playwright/test';
import type { SortByType } from '../../src/types/types';

type PurchaseVariant = {
  name: string;
  sortBy: SortByType;
  closeModal: (app: AppPageObjects) => Promise<void>;
};

const variants: PurchaseVariant[] = [
  {
    name: 'Highest price',
    sortBy: 'Price: High to Low',
    closeModal: async app => {
      await app.modalBuyPage.clickCancel();
    },
  },
  {
    name: 'Lowest price',
    sortBy: 'Price: Low to High',
    closeModal: async app => {
      await app.page.keyboard.press('Escape');
    },
  },
];

// WP-29 (separate, out of scope here): price exactly 10 shows "Download" instead of "Buy for Ƶ".
// Skip any card priced exactly 10 and take the next one so this test only exercises the "Buy for Ƶ" gate.
async function pickPaidCardSkippingTen(app: AppPageObjects): Promise<{ card: Locator; price: string }> {
  const cards = app.wallpapersListPage.cardsPremiumWithPrice;
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const price = await app.wallpapersListPage.getCardPriceBadgeText(card);
    if (price !== '10') return { card, price };
  }
  throw new Error('No paid card with a price other than 10 was found');
}

test.describe('Download and Purchase (Guest)', { tag: [tags.WALLPAPERS, tags.GUEST, tags.SMOKE] }, () => {
  for (const variant of variants) {
    test(`WP-30 ${variant.name} premium wallpaper shows its price and the purchase gate`, async ({ app, page }) => {
      await app.wallpapersListPage.open();
      await app.wallpapersListPage.filterByPrice(['Paid']);
      await app.wallpapersListPage.filterBySortBy(variant.sortBy);

      // 1. Pick the card, record its price and that it has a crown badge; open it
      const { card, price } = await pickPaidCardSkippingTen(app);
      await app.wallpapersListPage.validatePremiumWallpaper(card);
      const cardHref = await app.wallpapersListPage.getCardHref(card);
      await app.wallpapersListPage.selectCard(card);
      await page.waitForURL(`**${cardHref}`, { timeout: 5000 });

      // expect: detail page shows the Premium badge and the same price
      await expect(app.wallpaperDetailsPage.premiumBadge).toBeVisible();
      await expect(app.wallpaperDetailsPage.priceText(price)).toBeVisible();

      // expect: button "Buy for Ƶ<price>" is visible and enabled; there is no "Download" button
      await expect(app.wallpaperDetailsPage.buyBtn).toHaveText(`Buy for Ƶ${price}`);
      await expect(app.wallpaperDetailsPage.buyBtn).toBeEnabled();
      await expect(app.wallpaperDetailsPage.downloadBtn).not.toBeAttached();

      // 2. Click "Buy for Ƶ<price>"
      await app.wallpaperDetailsPage.clickBuy();

      // expect: modal "To buy this item you need <price> Zedge Credits" (or the credits needed) is visible
      // expect: credits package selector, "Log in" link, Cancel and Buy Credits are present
      await app.modalBuyPage.validatePurchaseModalDialog(price);

      // 3. Close the modal: Cancel for the Highest-price variant, Escape for the Lowest-price variant
      const urlBeforeClose = page.url();
      await variant.closeModal(app);

      // expect: modal closes, URL unchanged, "Buy for Ƶ<price>" still shown
      await expect(app.modalBuyPage.purchaseTitle(price)).toBeHidden();
      expect(page.url()).toBe(urlBeforeClose);
      await expect(app.wallpaperDetailsPage.buyBtn).toHaveText(`Buy for Ƶ${price}`);
    });
  }
});
