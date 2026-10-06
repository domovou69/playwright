import { Locator, Page } from '@playwright/test';
import { AudioCards } from '../AudioCards';

export class RingtoneCards extends AudioCards {
  constructor(grid: { cardsContainer: Locator; page: Page }) {
    super(grid, { area: 'ringtones', ariaLabelFor: title => `Ringtone: ${title}` });
  }
}
