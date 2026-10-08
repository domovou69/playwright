import { test as base, expect } from '@playwright/test';
import { AppPageObjects } from '../pages/AppPageObjects';

type MyFixtures = {
  rejectCookieConsent: void;
  blockAds: void;
  app: AppPageObjects;
};

// Ad-mediation and ad-serving domains observed loading on zedge.net (Aditude header bidding,
// Prebid, Google's ad-serving stack) - blocked so a live ad (e.g. a Google Vignette full-page
// interstitial) can't hijack navigation mid-test. Pure third-party noise, unrelated to what these
// tests exercise. See specs/metrics.md for the CI failures this is meant to prevent.
const AD_DOMAIN_PATTERNS = [
  /aditude\.(io|cloud)/,
  /prebid\.cloud/,
  /htlbid\.com/,
  /doubleclick\.net/,
  /googlesyndication\.com/,
  /googleadservices\.com/,
];

export const test = base.extend<MyFixtures>({
  app: async ({ page }, use) => {
    await use(new AppPageObjects(page));
  },

  rejectCookieConsent: [
    async ({ page }, use) => {
      const rejectBtn = page.locator('#didomi-notice-disagree-button');
      await page.addLocatorHandler(rejectBtn, async () => {
        await rejectBtn.click();
      });
      await use();
    },
    { auto: true },
  ],

  blockAds: [
    async ({ page }, use) => {
      await page.route(
        url => AD_DOMAIN_PATTERNS.some(pattern => pattern.test(url.hostname)),
        route => route.abort()
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
