// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';
import type { AppPageObjects } from '../../pages/AppPageObjects';
import type { Locator } from '@playwright/test';
import type { SortByType } from '../../src/types/types';
import { clearDownloadFolder } from '../../src/utils/helper';

type CloseMethod = 'Cancel button' | 'Escape key';

// The one place that knows how to close the purchase modal for a given method - variants below only
// carry data, never behavior.
async function closePurchaseModal(app: AppPageObjects, method: CloseMethod) {
  if (method === 'Cancel button') {
    await app.modalBuyPage.clickCancel();
  } else {
    await app.page.keyboard.press('Escape');
  }
}

type PurchaseVariant = {
  name: string;
  sortBy: SortByType;
  closeMethod: CloseMethod;
};

const variants: PurchaseVariant[] = [
  { name: 'Highest price', sortBy: 'Price: High to Low', closeMethod: 'Cancel button' },
  { name: 'Lowest price', sortBy: 'Price: Low to High', closeMethod: 'Escape key' },
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

test.describe('Download and Purchase (Guest)', { tag: ['@wallpapers', '@guest'] }, () => {
  test.beforeAll('Clear downloads folder', async () => {
    await clearDownloadFolder();
  });

  test('WP-28 Free wallpaper downloads after the ad', { tag: ['@download', '@smoke'] }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.downloadFreeWallpapers('free', 1);
  });

  for (const variant of variants) {
    test(`WP-30 ${variant.name} premium wallpaper shows its price and the purchase gate`, { tag: ['@smoke'] }, async ({ app, page }) => {
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
      await closePurchaseModal(app, variant.closeMethod);

      // expect: modal closes, URL unchanged, "Buy for Ƶ<price>" still shown
      await expect(app.modalBuyPage.purchaseTitle(price)).toBeHidden();
      expect(page.url()).toBe(urlBeforeClose);
      await expect(app.wallpaperDetailsPage.buyBtn).toHaveText(`Buy for Ƶ${price}`);
    });
  }

  test(
    'WP-29 Premium wallpapers priced 10 credits show inconsistent primary action buttons (Download vs Buy)',
    {
      tag: ['@BUG:ZED-3', '@regression'],
      annotation: {
        type: 'bug',
        description:
          'Two Premium wallpapers at the same price (10 credits) show a different primary action button: one ' +
          'shows "Download" (a watch-ad unlock), the other shows "Buy for Ƶ10" (the standard purchase modal). ' +
          'Expected: a Premium wallpaper at a given price always shows Buy - Download is only correct for a ' +
          'free wallpaper. Not a blanket "price 10 is always Download" rule (that was disproven - see ZED-3 and ' +
          "the corrected fact in specs/wallpapers.plan.md); it's inconsistent per specific item.",
      },
    },
    async ({ app, page }) => {
      // 1. "White Feathers Floating Dark Wallpaper" - Premium, price 10, shows Download (the buggy variant)
      await app.wallpapersListPage.open('/wallpapers/a1b0f0ad-1ccd-4410-95f7-f04b3823c604');
      await expect(app.wallpaperDetailsPage.premiumBadge).toBeVisible();
      await expect(app.wallpaperDetailsPage.priceText('10')).toBeVisible();
      await expect(app.wallpaperDetailsPage.downloadBtn).toBeVisible();
      await expect(app.wallpaperDetailsPage.buyBtn).not.toBeAttached();

      // 2. Click "Download" on the buggy variant
      await app.wallpaperDetailsPage.clickDownload();

      // expect (current, buggy): modal "Unlock and Support the Artist" with "Login & Watch Ad" and "Buy Credits"
      await app.modalBuyPage.validateModalDialog();

      // 3. Close the modal with its close (X) button
      const urlBeforeClose = page.url();
      await app.modalBuyPage.clickClose();

      // expect: modal closes, no download starts
      expect(page.url()).toBe(urlBeforeClose);
      await expect(app.wallpaperDetailsPage.downloadBtn).toBeVisible();

      // 4. "Spooky Mansion" - same Premium/price-10 tier, but correctly shows Buy (proves the inconsistency)
      await app.wallpapersListPage.open('/wallpapers/e1b7e619-872b-4180-bd79-2f426d91c225');
      await expect(app.wallpaperDetailsPage.premiumBadge).toBeVisible();
      await expect(app.wallpaperDetailsPage.priceText('10')).toBeVisible();
      await expect(app.wallpaperDetailsPage.buyBtn).toHaveText('Buy for Ƶ10');
      await expect(app.wallpaperDetailsPage.downloadBtn).not.toBeAttached();
    }
  );

  test('WP-32 Opening a premium wallpaper by direct URL keeps the gate', { tag: ['@regression'] }, async ({ app, page }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filterByPrice(['Paid']);
    await app.wallpapersListPage.filterBySortBy('Price: High to Low');

    // 1. Take the href of the first card from Price=Paid, Sort by=Price: High to Low; open a new page and go to that href
    const card = (await app.wallpapersListPage.cardsPremiumWithPrice.all())[0]!;
    const price = await app.wallpapersListPage.getCardPriceBadgeText(card);
    const cardHref = await app.wallpapersListPage.getCardHref(card);

    await page.goto(cardHref);

    // expect: Premium badge, price and "Buy for Ƶ<price>" are shown, same as when opened from the list
    await expect(app.wallpaperDetailsPage.premiumBadge).toBeVisible();
    await expect(app.wallpaperDetailsPage.priceText(price)).toBeVisible();
    await expect(app.wallpaperDetailsPage.buyBtn).toHaveText(`Buy for Ƶ${price}`);
  });

  test(
    'WP-33 Purchase modal logs an accessibility console error',
    {
      tag: ['@BUG:ZED-4', '@regression'],
      annotation: {
        type: 'bug',
        // The plan's original wording ("DialogContent requires a DialogTitle") no longer reproduces live -
        // confirmed by capturing every console message around the modal open, only this warning appears.
        // Same underlying issue (a Radix DialogContent missing an accessible-name attribute), different message.
        description:
          'Opening the "Buy for Ƶ" modal logs a console warning: Missing `Description` or `aria-describedby' +
          '={undefined}` for {DialogContent}. Expected: no console warning; the dialog has an accessible description.',
      },
    },
    async ({ app, page }) => {
      await app.wallpapersListPage.open();
      await app.wallpapersListPage.filterByPrice(['Paid']);
      await app.wallpapersListPage.filterBySortBy('Price: High to Low');

      // 1. Start collecting console errors, open a premium card priced other than 10
      const { card, price } = await pickPaidCardSkippingTen(app);
      const cardHref = await app.wallpapersListPage.getCardHref(card);
      await app.wallpapersListPage.selectCard(card);
      await page.waitForURL(`**${cardHref}`, { timeout: 5000 });

      const consoleWarnings: string[] = [];
      page.on('console', message => {
        if (message.type() === 'warning') consoleWarnings.push(message.text());
      });

      // click "Buy for Ƶ<price>"
      await app.wallpaperDetailsPage.clickBuy();
      await app.modalBuyPage.validatePurchaseModalDialog(price);

      // expect (current, buggy): a console warning about the missing accessible DialogContent description is logged
      expect(consoleWarnings.some(warning => warning.includes('Description') && warning.includes('DialogContent'))).toBe(true);
    }
  );
});
