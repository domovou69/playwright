// spec: specs/ringtones.plan.md
// seed: tests/seed.spec.ts

import { test } from '../../fixtures/test';

test.describe('Filters', { tag: ['@ringtones', '@guest'] }, () => {
  test.beforeEach('Open unfiltered /ringtones', async ({ app }) => {
    await app.ringtonesListPage.open();
  });

  test('RT-08 Each filter applied alone updates results and URL: Category', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.ringtonesListPage.scroll.getCardsHref();

    await app.ringtonesListPage.filtersBar.selectCategories(['Animals']);

    await app.ringtonesListPage.filtersBar.validateUrlParam('categories', 'ANIMALS');
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(baseline);
    await app.ringtonesListPage.filtersBar.validateCategoryApplied('Animals');
  });

  test('RT-08 Each filter applied alone updates results and URL: Tag', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.ringtonesListPage.scroll.getCardsHref();

    const [tag] = await app.ringtonesListPage.filtersBar.selectFirstTags(1);

    await app.ringtonesListPage.filtersBar.validateUrlParam('tags', tag!);
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(baseline);
  });

  test('RT-08 Each filter applied alone updates results and URL: Price Free', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.ringtonesListPage.scroll.getCardsHref();

    await app.ringtonesListPage.filtersBar.selectPrice('Free');

    await app.ringtonesListPage.filtersBar.validateUrlParam('free', 'true');
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(baseline);
    await app.ringtonesListPage.cards.validateAllFree();
  });

  test('RT-08 Each filter applied alone updates results and URL: Price Paid', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.ringtonesListPage.scroll.getCardsHref();

    await app.ringtonesListPage.filtersBar.selectPrice('Paid');

    await app.ringtonesListPage.filtersBar.validateUrlParam('paid', 'true');
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(baseline);
    await app.ringtonesListPage.cards.validateAllPriced();
  });

  test('RT-08 Each filter applied alone updates results and URL: Duration', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.ringtonesListPage.scroll.getCardsHref();

    await app.ringtonesListPage.filtersBar.setDuration(10, 15);

    await app.ringtonesListPage.filtersBar.validateUrlParam('minDuration', '10');
    await app.ringtonesListPage.filtersBar.validateUrlParam('maxDuration', '15');
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(baseline);
    await app.ringtonesListPage.cards.validateDurationBetween(10, 15);
  });

  test('RT-08 Each filter applied alone updates results and URL: Sort by', { tag: ['@smoke'] }, async ({ app }) => {
    const baseline = await app.ringtonesListPage.scroll.getCardsHref();

    await app.ringtonesListPage.filtersBar.sortBy('Most popular');

    await app.ringtonesListPage.filtersBar.validateUrlParam('sort', 'POPULAR');
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(baseline);
  });

  test('RT-09 Reset All clears every active filter', { tag: ['@smoke'] }, async ({ app }) => {
    // 1. Unfiltered: nothing to reset
    await app.ringtonesListPage.filtersBar.validateVisible();

    // 2. Two categories and a tag
    await app.ringtonesListPage.filtersBar.selectCategories(['Animals', 'Games']);
    await app.ringtonesListPage.filtersBar.selectFirstTags(1);
    await app.ringtonesListPage.filtersBar.validateVisible({ resetAll: true });
    const filtered = await app.ringtonesListPage.scroll.getCardsHref();

    // 3. Reset All
    await app.ringtonesListPage.filtersBar.resetAll();

    await app.ringtonesListPage.filtersBar.validateNoFilterParams();
    await app.ringtonesListPage.filtersBar.validateVisible();
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(filtered);
  });

  test('RT-10 Multiple options in Category and Tag', { tag: ['@regression'] }, async ({ app }) => {
    const baseline = await app.ringtonesListPage.scroll.getCardsHref();

    // 1. Two categories
    await app.ringtonesListPage.filtersBar.selectCategories(['Animals', 'Games']);

    await app.ringtonesListPage.filtersBar.validateCategoryChecked('Animals', true);
    await app.ringtonesListPage.filtersBar.validateCategoryChecked('Games', true);
    await app.ringtonesListPage.filtersBar.validateUrlParam('categories', 'ANIMALS,GAMES');
    await app.ringtonesListPage.filtersBar.validateChips(['Animals', 'Games']);
    await app.ringtonesListPage.scroll.waitForCardsToUpdate(baseline);

    // 2. Two tags
    const [first, second] = await app.ringtonesListPage.filtersBar.selectFirstTags(2);

    await app.ringtonesListPage.filtersBar.validateTagSelected(first!, true);
    await app.ringtonesListPage.filtersBar.validateTagSelected(second!, true);
    await app.ringtonesListPage.filtersBar.validateUrlParam('tags', `${first},${second}`);

    // 3. Uncheck one option of each: only the other stays
    await app.ringtonesListPage.filtersBar.unselectCategory('Games');
    await app.ringtonesListPage.filtersBar.validateCategoryChecked('Animals', true);
    await app.ringtonesListPage.filtersBar.validateCategoryChecked('Games', false);
    await app.ringtonesListPage.filtersBar.validateUrlParam('categories', 'ANIMALS');

    await app.ringtonesListPage.filtersBar.unselectTag(second!);
    await app.ringtonesListPage.filtersBar.validateTagSelected(first!, true);
    await app.ringtonesListPage.filtersBar.validateTagSelected(second!, false);
    await app.ringtonesListPage.filtersBar.validateUrlParam('tags', first!);
  });

  test('RT-11 Pairwise filter combinations: Category + Price Free', { tag: ['@regression'] }, async ({ app }) => {
    await app.ringtonesListPage.filtersBar.selectCategories(['Pop']);
    // The first filter must reach the URL before the second is applied, or the second can overwrite it.
    await app.ringtonesListPage.filtersBar.validateUrlParam('categories', 'POP');
    await app.ringtonesListPage.filtersBar.selectPrice('Free');

    await app.ringtonesListPage.filtersBar.validateUrlParam('categories', 'POP');
    await app.ringtonesListPage.filtersBar.validateUrlParam('free', 'true');
    await app.ringtonesListPage.cards.validateAllFree();
  });

  test('RT-11 Pairwise filter combinations: Price Paid + Sort by Price High to Low', { tag: ['@regression'] }, async ({ app }) => {
    await app.ringtonesListPage.filtersBar.selectPrice('Paid');
    await app.ringtonesListPage.filtersBar.validateUrlParam('paid', 'true');
    await app.ringtonesListPage.filtersBar.sortBy('Price: High to Low');

    await app.ringtonesListPage.filtersBar.validateUrlParam('paid', 'true');
    await app.ringtonesListPage.filtersBar.validateUrlParam('sort', 'PRICE_DESC');
    await app.ringtonesListPage.cards.validateAllPriced();
    await app.ringtonesListPage.cards.validatePricesNonIncreasing();
  });

  test('RT-11 Pairwise filter combinations: Price Free + Duration', { tag: ['@regression'] }, async ({ app }) => {
    await app.ringtonesListPage.filtersBar.selectPrice('Free');
    await app.ringtonesListPage.filtersBar.validateUrlParam('free', 'true');
    await app.ringtonesListPage.filtersBar.setDuration(10, 15);

    await app.ringtonesListPage.filtersBar.validateUrlParam('free', 'true');
    await app.ringtonesListPage.filtersBar.validateUrlParam('minDuration', '10');
    await app.ringtonesListPage.filtersBar.validateUrlParam('maxDuration', '15');
    await app.ringtonesListPage.cards.validateAllFree();
    await app.ringtonesListPage.cards.validateDurationBetween(10, 15);
  });

  test('RT-12 Price range From / To limits card prices', { tag: ['@regression'] }, async ({ app }) => {
    // Below 11 is useless: every paid card in the default order costs 10.
    await app.ringtonesListPage.filtersBar.setPriceRange(50, 500);

    await app.ringtonesListPage.filtersBar.validateUrlParam('minPrice', '50');
    await app.ringtonesListPage.filtersBar.validateUrlParam('maxPrice', '500');
    await app.ringtonesListPage.cards.validateAllPriced({ min: 50, max: 500 });
  });

  test('RT-13 Filters are restored from a deep link', { tag: ['@regression'] }, async ({ app }) => {
    await app.ringtonesListPage.open('/ringtones?categories=POP&sort=PRICE_DESC&minPrice=11&minDuration=5');

    await app.ringtonesListPage.filtersBar.validateCategoryChecked('Pop', true);
    await app.ringtonesListPage.filtersBar.validateSortSelected('Price: High to Low');
    await app.ringtonesListPage.filtersBar.validateChips(['Pop', 'From: 11 Ƶ', 'From: 5 Sec', 'Price: High to Low']);
    await app.ringtonesListPage.cards.validateAllPriced({ min: 11 });
    await app.ringtonesListPage.cards.validatePricesNonIncreasing();
    await app.ringtonesListPage.cards.validateDurationBetween(5);
    await app.ringtonesListPage.filtersBar.validatePriceFrom(11);
    await app.ringtonesListPage.filtersBar.validateDurationFrom(5);
  });
});
