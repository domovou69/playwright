import { test } from '../../fixtures/test';

test.describe('Wallpapers category navigation', { tag: ['@wallpapers', '@guest'] }, () => {
  test('WP-07 Header "Categories" menu opens a category in the list page', { tag: '@smoke' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.header.openCategories();
    await app.wallpapersListPage.header.validateCategoryGroups(['Wallpapers', 'Ringtones', 'Notification Sounds']);
    await app.wallpapersListPage.header.validateCategoryLinks('/wallpapers');

    await app.wallpapersListPage.header.selectCategory('/wallpapers', 'Nature');

    await app.wallpapersListPage.validateUrl('/wallpapers', { categories: 'NATURE' });
    await app.wallpapersListPage.cards.validateFirst(24);
    await app.wallpapersListPage.filtersBar.validateChips(['Nature']);
    await app.wallpapersListPage.filtersBar.validateResetAll(true);
  });

  test('WP-08 "Explore different wallpaper categories" opens a category page', { tag: '@regression' }, async ({ app }) => {
    await app.wallpapersListPage.open();

    await app.wallpapersListPage.exploreCategories.scrollIntoView();
    await app.wallpapersListPage.exploreCategories.validateVisible();

    await app.wallpapersListPage.exploreCategories.openCategory('Animals');

    await app.wallpapersCategoryPage.validateUrl('/category/wallpapers/animals');
    await app.wallpapersCategoryPage.validateTitle(/Animals Wallpapers and Backgrounds/);
    await app.wallpapersCategoryPage.mainHeader.validateHeading(/animals wallpapers and backgrounds/i);
    await app.wallpapersCategoryPage.cards.validateFirst(24);
    await app.wallpapersCategoryPage.filtersBar.validateAbsent();
    await app.wallpapersCategoryPage.validateSubCategoryChips();
  });
});
