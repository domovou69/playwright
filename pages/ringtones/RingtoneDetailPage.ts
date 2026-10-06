import { Page } from '@playwright/test';
import { AudioDetailPage } from '../AudioDetailPage';
import { RingtoneCards } from './RingtoneCards';

// /ringtones/<GUID>
export class RingtoneDetailPage extends AudioDetailPage {
  constructor(page: Page) {
    super(page, '/ringtones', grid => new RingtoneCards(grid));
  }
}
