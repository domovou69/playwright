import { expect, Locator } from '@playwright/test';

// Shared by the wallpapers Price and the ringtones Price / Duration ranges: a numeric From / To field commits to the URL only
// when it is blurred. Committing both in a row races the two (seen live as `minPrice=NaN`), so each value is awaited on its own.
export async function commitRangeValue(input: Locator, value: number, urlParam: string) {
  await input.fill(String(value));
  await input.press('Tab');
  await expect.poll(() => new URL(input.page().url()).searchParams.get(urlParam)).toBe(String(value));
}
