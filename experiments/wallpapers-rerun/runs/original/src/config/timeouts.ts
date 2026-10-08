const isCI = !!process.env.CI;

// Single source of truth for timeouts - imported by playwright.config.ts and by page
// objects/helpers that need to reuse the same values instead of hardcoding their own.
export const TIMEOUTS = {
  test: isCI ? 90_000 : 60_000,
  expect: isCI ? 10_000 : 7_000,
  action: isCI ? 10_000 : 7_000,
  navigation: isCI ? 45_000 : 30_000,
} as const;
