import { Page } from '@playwright/test';
import type { WallpapersListPage } from './WallpapersListPage';
import { WallpaperDetailPage } from './WallpaperDetailPage';
import { removeSpaces } from '../src/utils/helper';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';

// Downloading free wallpapers from the list and checking the saved file.
export class DownloadFlow {
  constructor(
    private readonly page: Page,
    private readonly list: WallpapersListPage
  ) {}

  async verifyDownload(folder: string, title: string) {
    const downloadPath = `downloads/${folder}/${title}.jpg`;
    for (let attempt = 0; attempt < 10; attempt++) {
      if (existsSync(downloadPath)) {
        const fileStats = await stat(downloadPath);
        if (fileStats.size > 0) {
          console.log(`Wallpaper "${title}" downloaded successfully.`);
          return;
        }
      }
      await new Promise(res => setTimeout(res, 1000));
    }
    throw new Error(`Wallpaper "${title}" was not downloaded or is empty.`);
  }

  async downloadFreeWallpapers(folder: string, length: number) {
    const cards = (await this.list.cardsFree.all()).slice(0, length);
    for (const card of cards) {
      const title = await this.list.getCardTitle(card);
      const titleWithoutSpaces = removeSpaces(title);
      await this.list.selectCard(card);
      const wallpaperPage = new WallpaperDetailPage(this.page);
      await wallpaperPage.saveFreeWallpaper(folder, titleWithoutSpaces);
      await this.verifyDownload(folder, titleWithoutSpaces);
      await this.page.goBack();
    }
  }
}
