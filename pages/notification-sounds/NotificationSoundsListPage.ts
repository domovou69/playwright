import { Page } from '@playwright/test';
import { AudioListPage } from '../AudioListPage';
import { NotificationSoundsFiltersBar } from './NotificationSoundsFiltersBar';
import { NotificationSoundCards } from './NotificationSoundCards';
import { CardListScroller } from '../CardListScroller';

export class NotificationSoundsListPage extends AudioListPage {
  readonly filtersBar: NotificationSoundsFiltersBar;
  readonly cards: NotificationSoundCards;
  readonly scroll: CardListScroller;

  constructor(page: Page) {
    super(page, '/notification-sounds');
    this.filtersBar = new NotificationSoundsFiltersBar(this);
    this.cards = new NotificationSoundCards(this);
    this.scroll = new CardListScroller(this.cardsAll, this.main);
  }
}
