import { test } from '../../fixtures/test';

const FILTER_PARAMS = ['categories', 'tags', 'free', 'paid', 'minPrice', 'maxPrice', 'colors', 'sort'];

// Each row starts from the unfiltered list and applies one option.
const SINGLE_FILTERS = [
  { title: 'Category Nature', filter: 'category', option: 'Nature', param: 'categories', value: 'NATURE' },
  { title: 'Color Black', filter: 'color', option: 'Black', param: 'colors', value: 'black' },
] as const;

// The start is a deep link so the row stays plain data; the sort option itself is chosen through the UI.
const HASH_SORTS = [
  { option: 'Newest first', start: '/wallpapers', value: 'NEWEST' },
  { option: 'Most popular', start: '/wallpapers', value: 'POPULAR' },
] as const;

const PRICE_SORTS = [
  { option: 'Price: High to Low', start: '/wallpapers?paid=true', value: 'PRICE_DESC', order: 'desc', atLeast: 0 },
  { option: 'Price: Low to High', start: '/wallpapers?minPrice=11', value: 'PRICE_ASC', order: 'asc', atLeast: 11 },
] as const;

test.describe('Wallpapers filters', { tag: ['@wallpapers', '@guest'] }, () => {
  for (const row of SINGLE_FILTERS) {
    test(`WP-09 ${row.title} applied alone updates results and URL`, { tag: '@smoke' }, async ({ app }) => {
      await app.wallpapersListPage.open();
      const baseline = await app.wallpapersListPage.cards.hrefs();

      await app.wallpapersListPage.filtersBar.apply(row.filter, [row.option]);

      await app.wallpapersListPage.validateUrl('/wallpapers', { [row.param]: row.value });
      await app.wallpapersListPage.filtersBar.validateChips([row.option]);
      await app.wallpapersListPage.cards.validateFirstHrefsDiffer(baseline);
      await app.wallpapersListPage.cards.validateFirst(24);
    });
  }

  test('WP-09 Sort by Most popular applied alone updates results and URL', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    const baseline = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.filtersBar.applySort('Most popular');

    await app.wallpapersListPage.validateUrl('/wallpapers', { sort: 'POPULAR' });
    await app.wallpapersListPage.filtersBar.validateChips(['Most popular']);
    await app.wallpapersListPage.cards.validateFirstHrefsDiffer(baseline);
    await app.wallpapersListPage.cards.validateFirst(24);
  });

  test('WP-09 Tag applied alone updates results and URL', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    const baseline = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.filtersBar.open('tag');
    const tag = await app.wallpapersListPage.filterDrawer.firstOptionName();
    await app.wallpapersListPage.filterDrawer.select(tag);
    await app.wallpapersListPage.filtersBar.closeFilter();

    await app.wallpapersListPage.validateUrl('/wallpapers', { tags: tag });
    await app.wallpapersListPage.filtersBar.validateChips([tag]);
    await app.wallpapersListPage.cards.validateFirstHrefsDiffer(baseline);
    await app.wallpapersListPage.cards.validateFirst(24);
  });

  test('WP-09 Price Free applied alone updates results and URL', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    const baseline = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.filtersBar.apply('price', ['Free']);

    await app.wallpapersListPage.validateUrl('/wallpapers', { free: 'true' });
    await app.wallpapersListPage.filtersBar.validateChips(['Free']);
    await app.wallpapersListPage.cards.validateFirstHrefsDiffer(baseline);
    await app.wallpapersListPage.cards.validateFirst(24);
    await app.wallpapersListPage.cards.validateNoPriceBadges(24);
  });

  test('WP-09 Price Paid applied alone updates results and URL', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    const baseline = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.filtersBar.apply('price', ['Paid']);

    await app.wallpapersListPage.validateUrl('/wallpapers', { paid: 'true' });
    await app.wallpapersListPage.filtersBar.validateChips(['Paid']);
    await app.wallpapersListPage.cards.validateFirstHrefsDiffer(baseline);
    await app.wallpapersListPage.cards.validateFirst(24);
    await app.wallpapersListPage.cards.validatePriced(24);
  });

  test('WP-10 Reset All clears Tag and Color filters', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filtersBar.validateResetAll(false);

    await app.wallpapersListPage.filtersBar.open('tag');
    const tags = await app.wallpapersListPage.filterDrawer.firstTwoOptionNames();
    await app.wallpapersListPage.filterDrawer.select(tags[0]);
    await app.wallpapersListPage.filterDrawer.select(tags[1]);
    await app.wallpapersListPage.filtersBar.closeFilter();
    await app.wallpapersListPage.filtersBar.apply('color', ['Red', 'Blue']);

    await app.wallpapersListPage.validateUrl('/wallpapers', { tags: tags.join(','), colors: 'red,blue' });
    await app.wallpapersListPage.filtersBar.validateResetAll(true);

    await app.wallpapersListPage.filtersBar.clickResetAll();

    await app.wallpapersListPage.validateUrlWithoutParams('/wallpapers', FILTER_PARAMS);
    await app.wallpapersListPage.filtersBar.validateResetAll(false);
    await app.wallpapersListPage.filtersBar.validateChipsHidden([...tags, 'Red', 'Blue']);
    await app.wallpapersListPage.cards.validateFirst(24);
  });

  test('WP-10 Reset All clears Category filters', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.filtersBar.apply('category', ['Nature', 'Space']);
    await app.wallpapersListPage.validateUrl('/wallpapers', { categories: 'NATURE,SPACE' });
    await app.wallpapersListPage.filtersBar.validateResetAll(true);

    await app.wallpapersListPage.filtersBar.clickResetAll();

    await app.wallpapersListPage.validateUrlWithoutParams('/wallpapers', FILTER_PARAMS);
    await app.wallpapersListPage.filtersBar.validateResetAll(false);
    await app.wallpapersListPage.filtersBar.validateChipsHidden(['Nature', 'Space']);
    await app.wallpapersListPage.cards.validateFirst(24);
  });

  test('WP-11 Multiple Category options can be selected and unselected', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.filtersBar.open('category');
    await app.wallpapersListPage.filterDrawer.select('Nature');
    await app.wallpapersListPage.filterDrawer.select('Space');
    await app.wallpapersListPage.filterDrawer.validateSelected('Nature', true);
    await app.wallpapersListPage.filterDrawer.validateSelected('Space', true);
    await app.wallpapersListPage.validateUrl('/wallpapers', { categories: 'NATURE,SPACE' });

    await app.wallpapersListPage.filterDrawer.deselect('Space');
    await app.wallpapersListPage.filterDrawer.validateSelected('Nature', true);
    await app.wallpapersListPage.validateUrl('/wallpapers', { categories: 'NATURE' });
    await app.wallpapersListPage.filtersBar.closeFilter();
    await app.wallpapersListPage.filtersBar.validateChips(['Nature']);
    await app.wallpapersListPage.filtersBar.validateChipsHidden(['Space']);
  });

  test('WP-11 Multiple Tag options can be selected and unselected', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.filtersBar.open('tag');
    const tags = await app.wallpapersListPage.filterDrawer.firstTwoOptionNames();
    await app.wallpapersListPage.filterDrawer.select(tags[0]);
    await app.wallpapersListPage.filterDrawer.select(tags[1]);
    await app.wallpapersListPage.filterDrawer.validateSelected(tags[0], true);
    await app.wallpapersListPage.filterDrawer.validateSelected(tags[1], true);
    await app.wallpapersListPage.validateUrl('/wallpapers', { tags: tags.join(',') });

    await app.wallpapersListPage.filterDrawer.deselect(tags[1]);
    await app.wallpapersListPage.filterDrawer.validateSelected(tags[0], true);
    await app.wallpapersListPage.validateUrl('/wallpapers', { tags: tags[0] });
    await app.wallpapersListPage.filtersBar.closeFilter();
    await app.wallpapersListPage.filtersBar.validateChips([tags[0]]);
    await app.wallpapersListPage.filtersBar.validateChipsHidden([tags[1]]);
  });

  test('WP-11 Multiple Color options can be selected and unselected', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.filtersBar.open('color');
    await app.wallpapersListPage.filterDrawer.select('Red');
    await app.wallpapersListPage.filterDrawer.select('Blue');
    await app.wallpapersListPage.filterDrawer.validateSelected('Red', true);
    await app.wallpapersListPage.filterDrawer.validateSelected('Blue', true);
    await app.wallpapersListPage.validateUrl('/wallpapers', { colors: 'red,blue' });

    await app.wallpapersListPage.filterDrawer.deselect('Red');
    await app.wallpapersListPage.filterDrawer.validateSelected('Blue', true);
    await app.wallpapersListPage.validateUrl('/wallpapers', { colors: 'blue' });
    await app.wallpapersListPage.filtersBar.closeFilter();
    await app.wallpapersListPage.filtersBar.validateChips(['Blue']);
    await app.wallpapersListPage.filtersBar.validateChipsHidden(['Red']);
  });

  for (const row of HASH_SORTS) {
    test(`WP-12 Sort by ${row.option} reorders cards and updates the URL`, { tag: '@regression' }, async ({ app }) => {
      await app.wallpapersListPage.open(row.start);
      const baseline = await app.wallpapersListPage.cards.hrefs();

      await app.wallpapersListPage.filtersBar.applySort(row.option);

      await app.wallpapersListPage.validateUrl('/wallpapers', { sort: row.value });
      await app.wallpapersListPage.filtersBar.validateChips([row.option]);
      await app.wallpapersListPage.cards.validateFirstHrefsDiffer(baseline);
      await app.wallpapersListPage.filtersBar.open('sortBy');
      await app.wallpapersListPage.filterDrawer.validateSelected(row.option, true);
      await app.wallpapersListPage.filtersBar.closeFilter();
    });
  }

  for (const row of PRICE_SORTS) {
    test(`WP-12 Sort by ${row.option} orders prices and updates the URL`, { tag: '@regression' }, async ({ app }) => {
      await app.wallpapersListPage.open(row.start);

      await app.wallpapersListPage.filtersBar.applySort(row.option);

      await app.wallpapersListPage.validateUrl('/wallpapers', { sort: row.value });
      await app.wallpapersListPage.cards.validatePriced(24, row.order, row.atLeast);
      await app.wallpapersListPage.filtersBar.open('sortBy');
      await app.wallpapersListPage.filterDrawer.validateSelected(row.option, true);
      await app.wallpapersListPage.filtersBar.closeFilter();
    });
  }

  test('WP-12 Choosing Relevance removes the sort param', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open('/wallpapers?sort=NEWEST');

    await app.wallpapersListPage.filtersBar.applySort('Relevance');

    await app.wallpapersListPage.validateUrlWithoutParams('/wallpapers', ['sort']);
    await app.wallpapersListPage.cards.validateFirst(24);
  });

  test('WP-13 Category Animals + Price Free combine in URL and results', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filtersBar.apply('category', ['Animals']);
    await app.wallpapersListPage.validateUrl('/wallpapers', { categories: 'ANIMALS' });
    const afterFirst = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.filtersBar.apply('price', ['Free']);

    await app.wallpapersListPage.validateUrl('/wallpapers', { categories: 'ANIMALS', free: 'true' });
    await app.wallpapersListPage.filtersBar.validateChips(['Animals', 'Free']);
    await app.wallpapersListPage.cards.validateFirstHrefsDiffer(afterFirst);
    await app.wallpapersListPage.cards.validateFirst(24);
    await app.wallpapersListPage.cards.validateNoPriceBadges(24);
  });

  test('WP-13 Price Paid + Sort by Price: High to Low combine in URL and results', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filtersBar.apply('price', ['Paid']);
    await app.wallpapersListPage.validateUrl('/wallpapers', { paid: 'true' });
    const afterFirst = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.filtersBar.applySort('Price: High to Low');

    await app.wallpapersListPage.validateUrl('/wallpapers', { paid: 'true', sort: 'PRICE_DESC' });
    await app.wallpapersListPage.filtersBar.validateChips(['Paid', 'Price: High to Low']);
    await app.wallpapersListPage.cards.validateFirstHrefsDiffer(afterFirst);
    await app.wallpapersListPage.cards.validatePriced(24, 'desc');
  });

  test('WP-13 Color Black + Sort by Newest first combine in URL and results', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();
    await app.wallpapersListPage.filtersBar.apply('color', ['Black']);
    await app.wallpapersListPage.validateUrl('/wallpapers', { colors: 'black' });
    const afterFirst = await app.wallpapersListPage.cards.hrefs();

    await app.wallpapersListPage.filtersBar.applySort('Newest first');

    await app.wallpapersListPage.validateUrl('/wallpapers', { colors: 'black', sort: 'NEWEST' });
    await app.wallpapersListPage.filtersBar.validateChips(['Black', 'Newest first']);
    await app.wallpapersListPage.cards.validateFirstHrefsDiffer(afterFirst);
    await app.wallpapersListPage.cards.validateFirst(24);
  });

  test('WP-14 Price range From / To limits card prices', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.filtersBar.applyPriceRange(50, 500);

    await app.wallpapersListPage.validateUrl('/wallpapers', { minPrice: '50', maxPrice: '500' });
    await app.wallpapersListPage.filtersBar.validateChips(['From: 50 Ƶ', 'To: 500 Ƶ']);
    await app.wallpapersListPage.cards.validatePriced(24, undefined, 50, 500);
  });

  test('WP-15 Filters are restored from a deep link', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open('/wallpapers?categories=NATURE&colors=black&sort=PRICE_DESC&minPrice=11&tags=halloween');

    await app.wallpapersListPage.filtersBar.validateChips(['Nature', 'halloween', 'Black', 'From: 11 Ƶ', 'Price: High to Low']);
    await app.wallpapersListPage.filtersBar.validateResetAll(true);
    await app.wallpapersListPage.cards.validateFirst(24);
    await app.wallpapersListPage.cards.validatePriced(24, undefined, 11);
    await app.wallpapersListPage.cards.validatePriced(10, 'desc', 11);

    await app.wallpapersListPage.filtersBar.open('category');
    await app.wallpapersListPage.filterDrawer.validateSelected('Nature', true);
    await app.wallpapersListPage.filtersBar.closeFilter();
    await app.wallpapersListPage.filtersBar.open('sortBy');
    await app.wallpapersListPage.filterDrawer.validateSelected('Price: High to Low', true);
    await app.wallpapersListPage.filtersBar.closeFilter();
    await app.wallpapersListPage.filtersBar.open('price');
    await app.wallpapersListPage.filterDrawer.validatePriceValue('From', '11');
    await app.wallpapersListPage.filtersBar.closeFilter();
  });
});
