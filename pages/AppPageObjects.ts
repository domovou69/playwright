import { Page } from '@playwright/test';
import { WallpapersListPage } from './WallpapersListPage';
import { WallpaperDetailPage } from './WallpaperDetailPage';
import { ModalBuyPage } from './BuyModalPage';
import { RingtonesListPage } from './ringtones/RingtonesListPage';
import { RingtoneDetailPage } from './ringtones/RingtoneDetailPage';
import { NotificationSoundDetailPage } from './notification-sounds/NotificationSoundDetailPage';
import { NotificationSoundsListPage } from './notification-sounds/NotificationSoundsListPage';

export class AppPageObjects {
  readonly ringtonesListPage: RingtonesListPage;
  readonly ringtoneDetailsPage: RingtoneDetailPage;
  readonly notificationSoundsListPage: NotificationSoundsListPage;
  readonly notificationSoundDetailsPage: NotificationSoundDetailPage;
  readonly wallpapersListPage: WallpapersListPage;
  readonly wallpaperDetailsPage: WallpaperDetailPage;
  readonly modalBuyPage: ModalBuyPage;

  constructor(readonly page: Page) {
    this.wallpapersListPage = new WallpapersListPage(page);
    this.wallpaperDetailsPage = new WallpaperDetailPage(page);
    this.modalBuyPage = new ModalBuyPage(page);
    this.ringtonesListPage = new RingtonesListPage(page);
    this.ringtoneDetailsPage = new RingtoneDetailPage(page);
    this.notificationSoundsListPage = new NotificationSoundsListPage(page);
    this.notificationSoundDetailsPage = new NotificationSoundDetailPage(page);
  }
}
