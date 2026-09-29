import { defineConfig, devices } from '@playwright/test';
import { currentsReporter } from '@currents/playwright';
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
  retries: 0,
  workers: 3,
  reporter: isCI ? [['html', { open: 'never' }], ['github'], currentsReporter()] : [['html', { open: 'on-failure' }], currentsReporter()],
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
