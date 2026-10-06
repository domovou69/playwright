// spec: specs/notification-sounds.plan.md
// seed: tests/seed.spec.ts

import { test } from '../../fixtures/test';

test.describe('Filters', { tag: ['@notification-sounds', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /notification-sounds', async ({ app }) => {
    await app.notificationSoundsListPage.open();
  });

  test('NS-07 Each filter applied alone updates results and URL: Category', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.notificationSoundsListPage.scroll.getCardsHref();

    await app.notificationSoundsListPage.filtersBar.selectCategories(['Message tones']);

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('categories', 'MESSAGE_TONES');
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(baseline);
    await app.notificationSoundsListPage.filtersBar.validateCategoryApplied('Message tones');
  });

  test('NS-07 Each filter applied alone updates results and URL: Tag', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.notificationSoundsListPage.scroll.getCardsHref();

    const [tag] = await app.notificationSoundsListPage.filtersBar.selectFirstTags(1);

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('tags', tag!);
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(baseline);
  });

  test('NS-07 Each filter applied alone updates results and URL: Price Free', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.notificationSoundsListPage.scroll.getCardsHref();

    await app.notificationSoundsListPage.filtersBar.selectPrice('Free');

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('free', 'true');
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(baseline);
    await app.notificationSoundsListPage.cards.validateAllFree();
  });

  test('NS-07 Each filter applied alone updates results and URL: Price Paid', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.notificationSoundsListPage.scroll.getCardsHref();

    await app.notificationSoundsListPage.filtersBar.selectPrice('Paid');

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('paid', 'true');
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(baseline);
    await app.notificationSoundsListPage.cards.validateAllPriced();
  });

  test('NS-07 Each filter applied alone updates results and URL: Duration', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.notificationSoundsListPage.scroll.getCardsHref();

    await app.notificationSoundsListPage.filtersBar.setDuration(2, 3);

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('minDuration', '2');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('maxDuration', '3');
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(baseline);
    await app.notificationSoundsListPage.cards.validateDurationBetween(2, 3);
  });

  test('NS-07 Each filter applied alone updates results and URL: Sort by', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.notificationSoundsListPage.scroll.getCardsHref();

    await app.notificationSoundsListPage.filtersBar.sortBy('Most popular');

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('sort', 'POPULAR');
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(baseline);
  });

  test('NS-08 Reset All clears every active filter', { tag: ['@smoke'] }, async ({ app }) => {
    // 1. Unfiltered: nothing to reset
    await app.notificationSoundsListPage.filtersBar.validateVisible();

    // 2. Two categories and a tag
    await app.notificationSoundsListPage.filtersBar.selectCategories(['Message tones', 'Sound effects']);
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('categories', 'MESSAGE_TONES,SOUND_EFFECTS');
    await app.notificationSoundsListPage.filtersBar.selectFirstTags(1);
    await app.notificationSoundsListPage.filtersBar.validateVisible({ resetAll: true });
    const filtered = await app.notificationSoundsListPage.scroll.getCardsHref();

    // 3. Reset All
    await app.notificationSoundsListPage.filtersBar.resetAll();

    await app.notificationSoundsListPage.filtersBar.validateNoFilterParams();
    await app.notificationSoundsListPage.filtersBar.validateVisible();
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(filtered);
  });

  test('NS-09 Multiple options in Category and Tag', { tag: ['@regression'] }, async ({ app }) => {
    const baseline = await app.notificationSoundsListPage.scroll.getCardsHref();

    // 1. Two categories
    await app.notificationSoundsListPage.filtersBar.selectCategories(['Message tones', 'Sound effects']);

    await app.notificationSoundsListPage.filtersBar.validateCategoryChecked('Message tones', true);
    await app.notificationSoundsListPage.filtersBar.validateCategoryChecked('Sound effects', true);
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('categories', 'MESSAGE_TONES,SOUND_EFFECTS');
    await app.notificationSoundsListPage.filtersBar.validateChips(['Message tones', 'Sound effects']);
    await app.notificationSoundsListPage.scroll.waitForCardsToUpdate(baseline);

    // 2. Two tags
    const [first, second] = await app.notificationSoundsListPage.filtersBar.selectFirstTags(2);

    await app.notificationSoundsListPage.filtersBar.validateTagSelected(first!, true);
    await app.notificationSoundsListPage.filtersBar.validateTagSelected(second!, true);
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('tags', `${first},${second}`);

    // 3. Uncheck one option of each: only the other stays
    await app.notificationSoundsListPage.filtersBar.unselectCategory('Sound effects');
    await app.notificationSoundsListPage.filtersBar.validateCategoryChecked('Message tones', true);
    await app.notificationSoundsListPage.filtersBar.validateCategoryChecked('Sound effects', false);
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('categories', 'MESSAGE_TONES');

    await app.notificationSoundsListPage.filtersBar.unselectTag(second!);
    await app.notificationSoundsListPage.filtersBar.validateTagSelected(first!, true);
    await app.notificationSoundsListPage.filtersBar.validateTagSelected(second!, false);
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('tags', first!);
  });

  test('NS-10 Pairwise filter combinations: Category Message tones + Price Free', { tag: ['@regression'] }, async ({ app }) => {
    await app.notificationSoundsListPage.filtersBar.selectCategories(['Message tones']);
    // The first filter must reach the URL before the second is applied, or the second can overwrite it.
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('categories', 'MESSAGE_TONES');
    await app.notificationSoundsListPage.filtersBar.selectPrice('Free');

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('categories', 'MESSAGE_TONES');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('free', 'true');
    await app.notificationSoundsListPage.cards.validateAllFree();
  });

  test('NS-10 Pairwise filter combinations: Price Paid + Sort by Price High to Low', { tag: ['@regression'] }, async ({ app }) => {
    await app.notificationSoundsListPage.filtersBar.selectPrice('Paid');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('paid', 'true');
    await app.notificationSoundsListPage.filtersBar.sortBy('Price: High to Low');

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('paid', 'true');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('sort', 'PRICE_DESC');
    await app.notificationSoundsListPage.cards.validateAllPriced();
    await app.notificationSoundsListPage.cards.validatePricesNonIncreasing();
  });

  test('NS-10 Pairwise filter combinations: Price Free + Duration', { tag: ['@regression'] }, async ({ app }) => {
    await app.notificationSoundsListPage.filtersBar.selectPrice('Free');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('free', 'true');
    await app.notificationSoundsListPage.filtersBar.setDuration(2, 3);

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('free', 'true');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('minDuration', '2');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('maxDuration', '3');
    await app.notificationSoundsListPage.cards.validateAllFree();
    await app.notificationSoundsListPage.cards.validateDurationBetween(2, 3);
  });

  test('NS-11 Price range From / To limits card prices', { tag: ['@regression'] }, async ({ app }) => {
    // Below 11 is useless: every paid card in the default order costs 10.
    await app.notificationSoundsListPage.filtersBar.setPriceRange(50, 500);

    await app.notificationSoundsListPage.filtersBar.validateUrlParam('minPrice', '50');
    await app.notificationSoundsListPage.filtersBar.validateUrlParam('maxPrice', '500');
    await app.notificationSoundsListPage.cards.validateAllPriced({ min: 50, max: 500 });
  });

  test('NS-12 Filters are restored from a deep link', { tag: ['@regression'] }, async ({ app }) => {
    // Message tones, not Pop: Pop with these filters returns a single card.
    await app.notificationSoundsListPage.open('/notification-sounds?categories=MESSAGE_TONES&sort=PRICE_DESC&minPrice=11&minDuration=1');

    await app.notificationSoundsListPage.filtersBar.validateCategoryChecked('Message tones', true);
    await app.notificationSoundsListPage.filtersBar.validateSortSelected('Price: High to Low');
    await app.notificationSoundsListPage.filtersBar.validateChips(['Message tones', 'From: 11 Ƶ', 'From: 1 Sec', 'Price: High to Low']);
    await app.notificationSoundsListPage.cards.validateAllPriced({ min: 11 });
    await app.notificationSoundsListPage.cards.validatePricesNonIncreasing();
    await app.notificationSoundsListPage.cards.validateDurationBetween(1);
    await app.notificationSoundsListPage.filtersBar.validatePriceFrom(11);
    await app.notificationSoundsListPage.filtersBar.validateDurationFrom(1);
  });
});
