import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { expect, Page } from '@playwright/test';

export function removeSpaces(value: string) {
  return value.replaceAll(' ', '');
}

/**
 * Waits for the Didomi cookie banner to close, right after navigation and before any dialog opens
 * Waits rather than clicking directly - the click itself is done by the addLocatorHandler in
 * fixtures/test.ts, which shares this same locator; clicking it here too would race that handler
 */
export async function dismissCookieBanner(page: Page, timeout = 10000) {
  const rejectBtn = page.locator('#didomi-notice-disagree-button');
  try {
    await expect(rejectBtn).toBeHidden({ timeout });
  } catch {
    // Banner never appeared, or never got dismissed in time - nothing more to do here
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
