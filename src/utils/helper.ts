import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { Page } from '@playwright/test';

export function removeSpaces(value: string) {
  return value.replaceAll(' ', '');
}

/**
 * Proactively dismiss the Didomi cookie banner right after navigation, before any dropdown/dialog is opened.
 * The `rejectCookieConsent` auto fixture (fixtures/test.ts) only reacts once the reject button becomes
 * visible mid-action, via addLocatorHandler - fine when the banner appears immediately, but on a slower
 * environment (CI) it can show up seconds later, after a Radix dialog is already open; clicking reject then
 * lands as an outside click and closes that dialog before the test's own assertion sees it. Calling this
 * once right after `page.goto(...)` consumes the banner before any dialog exists, so the lazy fixture handler
 * only needs to cover the rare case of a banner appearing even later. Best-effort: no banner shown -> no-op.
 */
export async function dismissCookieBanner(page: Page, timeout = 10000) {
  const rejectBtn = page.locator('#didomi-notice-disagree-button');
  try {
    await rejectBtn.click({ timeout });
  } catch {
    // Banner never appeared in time - nothing to dismiss.
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
