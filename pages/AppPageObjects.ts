import { Page } from '@playwright/test';
import { WallpapersListPage } from './WallpapersListPage';
import { WallpaperDetailPage } from './WallpaperDetailPage';
import { ModalBuyPage } from './BuyModalPage';

export class AppPageObjects {
  readonly wallpapersListPage: WallpapersListPage;
  readonly wallpaperDetailsPage: WallpaperDetailPage;
  readonly modalBuyPage: ModalBuyPage;

  constructor(readonly page: Page) {
    this.wallpapersListPage = new WallpapersListPage(page);
    this.wallpaperDetailsPage = new WallpaperDetailPage(page);
    this.modalBuyPage = new ModalBuyPage(page);
  }
}
