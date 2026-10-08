import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { expect, Page } from '@playwright/test';

export function removeSpaces(value: string) {
  return value.replaceAll(' ', '');
}

/**
 * Waits for the Didomi cookie banner to close, right after navigation and before any dialog opens.
 * The click itself is done by the addLocatorHandler in fixtures/test.ts, which shares this same
 * locator - so nothing here may use a retrying wait (`.click()`, `.waitFor()`) directly on it: any
 * retrying call is itself treated as an interceptable action, triggers the handler mid-wait, and then
 * keeps waiting for a state the handler's own click just moved past - a hang for the full timeout.
 * Confirmed live for both `.click()` and `.waitFor({ state: 'visible' })`.
 *
 * Only a one-shot, non-retrying read (`.isVisible()`) is safe - confirmed live it does not trigger the
 * handler. So: poll for appearance with one-shot reads (safe), then once actually visible, use
 * `toBeHidden()` to wait for the handler's click to land (also safe - the element already exists, so
 * this isn't the same "resolves instantly" gap as calling `toBeHidden()` before it ever appeared).
 */
export async function dismissCookieBanner(page: Page, timeout = 10000) {
  const rejectBtn = page.locator('#didomi-notice-disagree-button');
  const deadline = Date.now() + timeout;
  try {
    while (!(await rejectBtn.isVisible()) && Date.now() < deadline) {
      await page.waitForTimeout(100);
    }
    if (await rejectBtn.isVisible()) {
      await expect(rejectBtn).toBeHidden({
        timeout: Math.max(deadline - Date.now(), 0),
      });
    }
  } catch {
    // Banner never appeared within timeout, or never got dismissed in time - nothing more to do here
  }
}

export function hasUniqueValues(arr: string[]): boolean {
  return new Set(arr).size === arr.length;
}

export async function clearDownloadFolder() {
  const downloadDir = join(process.cwd(), 'downloads');
  try {
    await rm(downloadDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Error removing folder:', err);
  } finally {
    await mkdir(downloadDir, { recursive: true });
  }
}

/**
 * The site is server-rendered; controls clicked before React hydrates them are silently ignored.
 * Hydrated elements carry a `__reactProps$…` key, so wait until the first button in <main> has one.
 */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('main button, main a');
    return !!el && Object.keys(el).some(k => k.startsWith('__reactProps'));
  });
}
