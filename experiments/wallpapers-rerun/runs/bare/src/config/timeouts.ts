// The production site is slow under load (hydration lags first paint), so local and CI share generous values.
// Single source of truth for timeouts - imported by playwright.config.ts and by page
// objects/helpers that need to reuse the same values instead of hardcoding their own.
export const TIMEOUTS = {
  test: 90_000,
  expect: 10_000,
  action: 10_000,
  navigation: 45_000,
} as const;
