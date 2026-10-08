import { Page } from '@playwright/test';
import { BuyModalPage } from './BuyModalPage';
import { CategoryPage } from './CategoryPage';
import { NotFoundPage } from './NotFoundPage';
import { WallpaperDetailPage } from './WallpaperDetailPage';
import { WallpapersListPage } from './WallpapersListPage';

/** One property per area entry page; tests reach every component through it. */
export class AppPageObjects {
  readonly wallpapersListPage: WallpapersListPage;
  /** Reached from the Explore block of the list page, not an entry page (no `open`). */
  readonly wallpapersCategoryPage: CategoryPage;

  /** Reached by clicking a card of the list page, not an entry page (no `open`). */
  readonly wallpaperDetailPage: WallpaperDetailPage;

  /** Shared with the other areas; the purchase gates of any premium item. */
  readonly buyModal: BuyModalPage;
  /** The 404 page of an unknown wallpaper (no list heading, so it has its own `open`). */
  readonly wallpapersNotFoundPage: NotFoundPage;

  constructor(page: Page) {
    this.wallpapersListPage = new WallpapersListPage(page);
    this.wallpaperDetailPage = new WallpaperDetailPage(page);
    this.buyModal = new BuyModalPage(page);
    this.wallpapersNotFoundPage = new NotFoundPage(page, '/wallpapers');
    this.wallpapersCategoryPage = new CategoryPage(page, '/wallpapers', '/category/wallpapers');
  }
}
