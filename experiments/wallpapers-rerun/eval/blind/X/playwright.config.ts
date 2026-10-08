import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { TIMEOUTS } from './src/config/timeouts';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: TIMEOUTS.test,
  expect: {
    timeout: TIMEOUTS.expect,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
    baseURL: process.env.BASE_URL ?? 'https://www.zedge.net/',
    trace: 'retain-on-failure-and-retries',
    video: 'retain-on-failure',
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
