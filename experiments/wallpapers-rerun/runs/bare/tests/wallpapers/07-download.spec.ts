import { readFile } from 'fs/promises';
import { expect, test } from '../../fixtures/test';
import { WallpaperDetailPage } from '../../src/pages/wallpaper-detail.page';
import { pickFromFeed } from './helpers';

const IMAGE_MAGIC: Record<string, number[]> = {
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],
};

test.describe('Free wallpaper download (guest)', () => {
  test.setTimeout(120_000); // guest downloads wait out a ~15 s countdown
  test('guest can download a free wallpaper without signing in', async ({ page }, testInfo) => {
    const { href } = await pickFromFeed(page, '/wallpapers?free=true');
    const detail = new WallpaperDetailPage(page);
    await detail.goto(href);
    await detail.expectLoaded();

    const download = await detail.download();

    const name = download.suggestedFilename();
    expect(name).toMatch(/\.(jpe?g|png|webp)$/i);
    const target = testInfo.outputPath(name);
    await download.saveAs(target);
    const bytes = await readFile(target);
    expect(bytes.length, 'file is a real image, not an error stub').toBeGreaterThan(20_000);
    const ext = name.split('.').pop()!.toLowerCase().replace('jpeg', 'jpg');
    expect([...bytes.subarray(0, IMAGE_MAGIC[ext]!.length)]).toEqual(IMAGE_MAGIC[ext]);

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(detail.gate.dialog).toBeHidden();
  });

  test('the downloaded file name is derived from the wallpaper title', async ({ page }) => {
    const { href } = await pickFromFeed(page, '/wallpapers?free=true');
    const detail = new WallpaperDetailPage(page);
    await detail.goto(href);
    await detail.expectLoaded();
    const title = (await detail.title.innerText()).trim().toLowerCase();
    const download = await detail.download();
    const stem = download
      .suggestedFilename()
      .replace(/\.[^.]+$/, '')
      .toLowerCase();
    expect(stem.length).toBeGreaterThan(0);
    expect(title.replace(/[^\p{L}\p{N}]+/gu, '')).toContain(stem.replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 5));
  });

  test('a countdown dialog is shown while the download is prepared, then closes', async ({ page }) => {
    const { href } = await pickFromFeed(page, '/wallpapers?free=true');
    const detail = new WallpaperDetailPage(page);
    await detail.goto(href);
    await detail.expectLoaded();
    await detail.download();
    await expect(detail.preparingDialog).toBeHidden({ timeout: 10_000 });
    await expect(detail.downloadButton).toBeEnabled();
  });

  test('download can be repeated on the same page', async ({ page }) => {
    const { href } = await pickFromFeed(page, '/wallpapers?free=true');
    const detail = new WallpaperDetailPage(page);
    await detail.goto(href);
    await detail.expectLoaded();
    for (let i = 0; i < 2; i++) {
      const download = await detail.download();
      expect(download.suggestedFilename()).toMatch(/\.(jpe?g|png|webp)$/i);
      await detail.waitForDownloadDialogToClose();
    }
  });
});
