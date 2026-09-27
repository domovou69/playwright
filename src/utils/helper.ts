import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

export function removeSpaces(value: string) {
  return value.replaceAll(' ', '');
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
