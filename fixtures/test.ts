import { test as base, expect } from '@playwright/test';
import { AppPageObjects } from '../pages/AppPageObjects';

type MyFixtures = {
  app: AppPageObjects;
  declineCookieConsent: void;
};

export const test = base.extend<MyFixtures>({
  // Declares the consent decision to Didomi's own SDK before its script runs, via its documented
  // didomiOnReady queue - the notice is never shown at all, rather than showing and then being
  // dismissed. Avoids the whole class of races around a banner appearing at an unpredictable time
  // mid-test (see specs/metrics.md for the history of trying to dismiss it reactively instead).
  declineCookieConsent: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        (window as unknown as { didomiOnReady: Array<(didomi: { setUserDisagreeToAll: () => void }) => void> }).didomiOnReady ??= [];
        (window as unknown as { didomiOnReady: Array<(didomi: { setUserDisagreeToAll: () => void }) => void> }).didomiOnReady.push(didomi =>
          didomi.setUserDisagreeToAll()
        );
      });
      await use();
    },
    { auto: true },
  ],

  app: async ({ page }, use) => {
    await use(new AppPageObjects(page));
  },
});

export { expect };
