import { Page } from '@playwright/test';
import { AudioDetailPage } from '../AudioDetailPage';
import { NotificationSoundCards } from './NotificationSoundCards';

// /notification-sounds/<GUID>
export class NotificationSoundDetailPage extends AudioDetailPage {
  constructor(page: Page) {
    super(page, '/notification-sounds', grid => new NotificationSoundCards(grid));
  }
}
