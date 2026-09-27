import { test as base, expect } from '@playwright/test';
import { AppPageObjects } from '../pages/AppPageObjects';

type MyFixtures = {
  app: AppPageObjects;
  rejectCookieConsent: void;
};

export const test = base.extend<MyFixtures>({
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

  app: async ({ page }, use) => {
    await use(new AppPageObjects(page));
  },
});

export { expect };
