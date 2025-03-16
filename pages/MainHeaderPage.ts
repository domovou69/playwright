import { Locator, Page } from '@playwright/test';

export class BodyHeaderPage {
  readonly body: Locator;
  readonly cardsHeaderTitle: Locator;
  readonly cardsCategoryFilter: Locator;
  readonly cardsFilter: Locator;

  constructor(readonly page: Page) {
    this.body = this.page.locator('main');
    this.cardsHeaderTitle = this.body.locator('h1');
    this.cardsCategoryFilter = this.page.locator('(//main//h1/following-sibling::div/div)[2]/button[1]');
    this.cardsFilter = this.page.locator('(//main//h1/following-sibling::div/div)[2]/button[2]');
  }

  async openFilters() {
    await this.cardsFilter.click();
  }
}
