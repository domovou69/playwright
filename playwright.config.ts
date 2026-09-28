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
  retries: 1,
  workers: 3,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'on-failure' }]],
  use: {
    headless: true,
    actionTimeout: TIMEOUTS.action,
    navigationTimeout: TIMEOUTS.navigation,
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
