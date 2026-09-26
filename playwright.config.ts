import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: isCI ? 90_000 : 60_000,
  expect: {
    timeout: isCI ? 10_000 : 7_000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: 0,
  workers: 1,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'on-failure' }]],
  use: {
    headless: isCI,
    actionTimeout: isCI ? 10_000 : 7_000,
    navigationTimeout: isCI ? 45_000 : 30_000,
    baseURL: process.env.BASE_URL,
    trace: isCI ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--disable-dev-shm-usage'],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
