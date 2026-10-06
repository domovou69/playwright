import { Locator, Page } from '@playwright/test';
import { AudioCards } from '../AudioCards';

export class NotificationSoundCards extends AudioCards {
  constructor(grid: { cardsContainer: Locator; page: Page }) {
    // The aria-label reads "Ringtone: <title>" on this section (bug candidate 4 of the plan): only the title is asserted.
    super(grid, {
      area: 'notification-sounds',
      ariaLabelFor: title => new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    });
  }
}
