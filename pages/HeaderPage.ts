import { expect, Locator, Page } from '@playwright/test';
import { CategoriesMainType, WallpaperCategoryType, RingtoneCategoryType, NotificationSoundCategoryType, SearchOptionType } from '../src/types/types';
import { WallpapersListPage } from './WallpapersListPage';

export class HeaderPage {
  readonly header: Locator;
  readonly logo: Locator;
  readonly categories: Locator;
  readonly categoriesDropdown: Locator;
  readonly searchForm: Locator;
  readonly searchFilterBtn: Locator;
  readonly searchFilterDropdown: Locator;
  readonly searchFilterDropdownItems: Locator;
  readonly searchFilterSelected: Locator;
  readonly searchInput: Locator;
  readonly searchSubmitBtn: Locator;
  readonly searchCancelBtn: Locator;
  readonly myCreditsBtn: Locator;
  readonly signInBtn: Locator;

  constructor(readonly page: Page) {
    this.header = this.page.locator("nav[class*='header_nav']");
    this.logo = this.header.locator('a').first();
    this.categories = this.header.locator('//button[span[contains(text(), "Categories")]]');
    this.categoriesDropdown = this.page.locator('[data-radix-popper-content-wrapper]');
    this.searchForm = this.header.locator('form');
    this.searchFilterBtn = this.searchForm.locator('button[arial-role="combobox"]');
    this.searchFilterDropdown = this.page.locator('[data-radix-popper-content-wrapper]');
    this.searchFilterDropdownItems = this.searchFilterDropdown.locator('div[role="menuitemradio"]');
    this.searchFilterSelected = this.searchFilterBtn.locator('span').first();
    this.searchInput = this.searchForm.locator('input');
    this.searchSubmitBtn = this.searchForm.locator('button[type="submit"]');
    this.searchCancelBtn = this.header.locator('button', { hasText: 'Cancel' });
    this.myCreditsBtn = this.header.locator('button[data-test-id="button-zCoin"]');
    this.signInBtn = this.header.locator('button', { hasText: 'Sign in' });
  }

  async selectCategory(category: CategoriesMainType, selection: WallpaperCategoryType | RingtoneCategoryType | NotificationSoundCategoryType) {
    const urlPattern = `/${category.toLowerCase().replace(' ', '-')}?categories=${selection.toUpperCase()}"]`;
    const categoryOption = this.page.locator(`a[href="${urlPattern}`);
    await categoryOption.scrollIntoViewIfNeeded();
    await categoryOption.click();
    expect(this.page.url()).toContain(urlPattern);
    await this.page.waitForLoadState();
  }

  async validateHeader() {
    await expect(this.header).toBeVisible();
    await expect(this.logo).toBeVisible();
    await expect(this.categories).toBeVisible();
    await expect(this.searchForm).toBeVisible();
    await expect(this.searchFilterBtn).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    const inputText = await this.searchInput.innerText();
    inputText === '' ? await expect(this.searchCancelBtn).not.toBeAttached() : await expect(this.searchCancelBtn).toBeVisible();
    await expect(this.searchSubmitBtn).toBeEnabled();
    await expect(this.myCreditsBtn).toBeEnabled();
    await expect(this.signInBtn).toBeEnabled();
    await expect(this.signInBtn.locator('svg')).toBeVisible();
    await expect(this.signInBtn).toBeEnabled();
  }

  async clickSearchFilter() {
    const isExpanded = 'true' === (await this.searchFilterBtn.getAttribute('aria-expanded')) ? true : false;
    isExpanded ? await expect(this.searchFilterDropdown).toBeVisible() : await expect(this.searchFilterDropdown).not.toBeAttached();
    await this.searchFilterBtn.click();
    await expect(this.searchFilterDropdown).toBeAttached();
  }

  async selectSearchFilter(option: SearchOptionType) {
    await this.searchFilterBtn.click();
    await this.searchFilterDropdown.waitFor({ state: 'attached' });

    await this.searchFilterDropdownItems
      .locator('label')
      .filter({
        hasText: option,
      })
      .first()
      .click();
    await expect(this.searchFilterDropdown).not.toBeAttached();
    await expect(this.searchFilterSelected).toHaveText(option);
  }

  async validateSearchDropdownSelection(expectedSelection: SearchOptionType) {
    const menuItems = await this.searchFilterDropdownItems.all();

    for (const item of menuItems) {
      const isChecked = (await item.getAttribute('aria-checked')) === 'true';
      const hasSVG = (await item.locator('svg').count()) > 0;
      const labelText = (await item.locator('label').innerText()) || '';

      if (labelText.trim() === expectedSelection) {
        if (!isChecked || !hasSVG) {
          throw new Error(`Expected '${expectedSelection}' to be selected and contain SVG`);
        }
      } else {
        if (isChecked || hasSVG) {
          throw new Error(`Unexpected selection: '${labelText}' is marked as checked.`);
        }
      }
    }
  }

  async search(value: string, filter: SearchOptionType = 'All') {
    const wallpapersListPage = new WallpapersListPage(this.page);
    const cardsListBefore = await wallpapersListPage.cardsAll.all();

    await this.searchInput.clear();
    await this.searchCancelBtn.waitFor({ state: 'detached' });
    await this.searchInput.fill(value);
    await this.searchCancelBtn.waitFor({ state: 'attached' });
    const selectedFilter = await this.searchFilterSelected.innerText();
    if (selectedFilter !== filter) {
      await this.selectSearchFilter(filter);
    }
    const inputValue = await this.searchInput.getAttribute('value');
    expect(inputValue).toBe(value);
    await this.searchSubmitBtn.click();
    await this.page.waitForURL(
      url => {
        const encodedValue = encodeURIComponent(value); // Encode spaces and special characters
        const expectedPath = filter === 'All' ? `find/${encodedValue}` : `?keyword=${encodedValue}`;
        return url.toString().includes(expectedPath);
      },
      { timeout: 10000 }
    );
    expect(inputValue).toBe(value);
    await expect(this.searchCancelBtn).toBeEnabled();

    await wallpapersListPage.waitForCardsToUpdate(cardsListBefore);
  }

  async clickCancelSearch() {
    await this.searchCancelBtn.click();
    await expect(this.searchInput).toHaveText('');
    await this.searchCancelBtn.waitFor({ state: 'detached' });
  }
}
