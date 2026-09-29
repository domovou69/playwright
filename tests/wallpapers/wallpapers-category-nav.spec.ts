// spec: specs/wallpapers.plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/test';

test.describe('Category Navigation', { tag: ['@wallpapers', '@guest'] }, () => {
  test('WP-10 Header "Categories" menu opens a category in the list page', { tag: ['@smoke'] }, async ({ app, page }) => {
    await app.wallpapersListPage.open();

    // 1. Click the header "Categories" button
    await app.wallpapersListPage.categories.click();
    await expect(app.wallpapersListPage.categoriesDialog).toBeVisible();
    await expect(app.wallpapersListPage.categoriesDialog.getByText('Wallpapers', { exact: true })).toBeVisible();
    await expect(app.wallpapersListPage.categoriesDialog.getByText('Ringtones', { exact: true })).toBeVisible();
    await expect(app.wallpapersListPage.categoriesDialog.getByText('Notification Sounds', { exact: true })).toBeVisible();

    // 2. In the Wallpapers group click "Nature"
    await app.wallpapersListPage.selectCategory('Wallpapers', 'Nature');
    await expect(page).toHaveURL(/\/wallpapers\?categories=NATURE$/);

    await expect(app.wallpapersListPage.cardsAll.first()).toBeVisible();
    expect(await app.wallpapersListPage.cardsAll.count()).toBeGreaterThan(0);

    expect(await app.wallpapersListPage.isCategorySelected('Nature')).toBe(true);
  });

  type CategoryExploreCase = {
    category: 'Nature' | 'Space';
    slug: string;
  };

  const categoryExploreCases: CategoryExploreCase[] = [
    { category: 'Nature', slug: 'nature' },
    { category: 'Space', slug: 'space' },
  ];

  for (const current of categoryExploreCases) {
    test(
      `WP-11 ${current.category}: "Explore different wallpaper categories" opens a category page with sub-filters`,
      { tag: ['@regression'] },
      async ({ app, page }) => {
        await app.wallpapersListPage.open();

        // 1. On /wallpapers scroll to "Explore different wallpaper categories" and click the category link
        await app.wallpapersListPage.exploreCategoriesHeading.scrollIntoViewIfNeeded();
        await app.wallpapersListPage.exploreCategoryLink(current.category).click();

        await expect(page).toHaveURL(new RegExp(`/category/wallpapers/${current.slug}$`));
        await expect(app.wallpapersListPage.wallpaperTitle).toBeVisible();
        await expect(app.wallpapersListPage.cardsAll.first()).toBeVisible();
        expect(await app.wallpapersListPage.cardsAll.count()).toBeGreaterThan(0);

        // 2. Record H1 and card hrefs, then select a different sub-filter on the page
        const h1Before = await app.wallpapersListPage.wallpaperTitle.innerText();
        const hrefsBefore = await app.wallpapersListPage.getCardsHref();

        await app.wallpapersListPage.selectDifferentSubFilter();

        await app.wallpapersListPage.waitForCardsToUpdate(hrefsBefore);
        const h1After = app.wallpapersListPage.wallpaperTitle;
        const hrefsAfter = await app.wallpapersListPage.getCardsHref();
        await expect(h1After).not.toHaveText(h1Before);
        expect(hrefsAfter).not.toEqual(hrefsBefore);
      }
    );
  }
});
