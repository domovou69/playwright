import { test as base, expect, type Page } from '@playwright/test';
import { AppPageObjects } from '../pages/AppPageObjects';

// Define custom fixture type
type MyFixtures = {
  app: AppPageObjects;
};

// Extend Playwright test with custom fixture
export const test = base.extend<MyFixtures>({
  app: async ({ page }, use) => {
    const app = new AppPageObjects(page);
    await use(app);
  },
});

export { expect };
