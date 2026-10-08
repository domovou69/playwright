import { expect, Locator, Page } from '@playwright/test';

export type SearchScope = 'All' | 'Wallpapers' | 'Ringtones' | 'Notification Sounds' | 'Artists';

/** The site header for a guest: logo, Categories, search with a scope chip, credits, Upload, Sign in. */
export class HeaderPage {
  readonly logo: Locator;
  readonly categoriesButton: Locator;
  readonly categoriesDialog: Locator;
  readonly scopeChip: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly cancelButton: Locator;
  readonly creditsButton: Locator;
  readonly uploadButton: Locator;
  readonly signInButton: Locator;

  constructor(private readonly page: Page) {
    const nav = page.getByRole('navigation').first();
    this.logo = nav.getByRole('link').first();
    this.categoriesButton = nav.getByRole('button', { name: 'Categories' });
    this.categoriesDialog = page.getByRole('dialog', { name: 'Categories' });
    this.scopeChip = nav.getByRole('button', { name: /^(All|Wallpapers|Ringtones|Notification Sounds|Artists)$/ });
    this.searchInput = nav.getByRole('textbox', { name: 'Search Zedge' });
    this.searchButton = nav.getByRole('button', { name: 'Search', exact: true });
    this.cancelButton = nav.getByRole('button', { name: 'Cancel' });
    this.creditsButton = nav.locator('[data-test-id="button-zCoin"]');
    this.uploadButton = nav.getByRole('button', { name: 'Upload' });
    this.signInButton = nav.getByRole('button', { name: 'Sign in' });
  }

  async selectScope(scope: SearchScope) {
    await this.scopeChip.click();
    await this.page.getByRole('menuitemradio', { name: scope, exact: true }).click();
    await this.validateScope(scope);
  }

  async openCategories() {
    await this.categoriesButton.click();
    await expect(this.categoriesDialog).toBeVisible();
  }

  /** `hrefPrefix` picks the area group (`/wallpapers`); `name` is the link text, case-insensitive. */
  async selectCategory(hrefPrefix: string, name: string) {
    await this.categoriesDialog
      .locator(`a[href^="${hrefPrefix}?categories="]`)
      .filter({ hasText: new RegExp(`^${name}$`, 'i') })
      .click();
    await expect(this.categoriesDialog).toBeHidden();
  }

  async validateCategoryGroups(groups: string[]) {
    for (const group of groups) {
      await expect(this.categoriesDialog.getByText(group, { exact: true })).toBeVisible();
    }
  }

  /** Every link of the area group points to `<hrefPrefix>?categories=<UPPER_SNAKE>`. */
  async validateCategoryLinks(hrefPrefix: string) {
    const links = this.categoriesDialog.locator(`a[href^="${hrefPrefix}?"]`);
    await expect(links.first()).toBeVisible();
    const hrefs = await links.evaluateAll(elements => elements.map(element => element.getAttribute('href') ?? ''));
    const pattern = new RegExp(`^${hrefPrefix}\\?categories=[A-Z_]+$`);
    expect(hrefs.filter(href => !pattern.test(href))).toEqual([]);
  }

  async search(value: string) {
    await this.searchInput.fill(value);
    await this.searchButton.click();
  }

  async validateScope(scope: SearchScope) {
    await expect(this.scopeChip).toHaveText(scope);
  }

  async validateSearchState(value: string, scope: SearchScope) {
    await expect(this.searchInput).toHaveValue(value);
    await this.validateScope(scope);
  }

  async validateDefaultState() {
    for (const control of [
      this.logo,
      this.categoriesButton,
      this.scopeChip,
      this.searchInput,
      this.searchButton,
      this.creditsButton,
      this.uploadButton,
      this.signInButton,
    ]) {
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
    }
    await expect(this.logo).toHaveAttribute('href', '/ringtones-and-wallpapers');
    await this.validateScope('All');
    await expect(this.cancelButton).toBeHidden();
  }
}
