import { Page } from '@playwright/test';
import { AudioListPage } from '../AudioListPage';
import { RingtonesFiltersBar } from './RingtonesFiltersBar';
import { RingtoneCards } from './RingtoneCards';
import { CardListScroller } from '../CardListScroller';
import { ExploreCategories } from '../ExploreCategories';

export class RingtonesListPage extends AudioListPage {
  readonly filtersBar: RingtonesFiltersBar;
  readonly cards: RingtoneCards;
  readonly scroll: CardListScroller;
  readonly explore: ExploreCategories;

  constructor(page: Page) {
    super(page, '/ringtones');
    this.filtersBar = new RingtonesFiltersBar(this);
    this.cards = new RingtoneCards(this);
    this.scroll = new CardListScroller(this.cardsAll, this.main);
    this.explore = new ExploreCategories(page, this.main, 'ringtone');
  }
}
