import { Locator, Page } from '@playwright/test';
import { AudioFiltersBar } from '../AudioFiltersBar';

export class NotificationSoundsFiltersBar extends AudioFiltersBar {
  constructor(list: { main: Locator; page: Page }) {
    super(list, 'Notification Sounds');
  }
}
