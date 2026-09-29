import { expect, Locator, Page } from '@playwright/test';
import { HeaderPage } from './HeaderPage';
import { BodyHeaderPage } from './MainHeaderPage';
import { removeSpaces, dismissCookieBanner } from '../src/utils/helper';
import { TIMEOUTS } from '../src/config/timeouts';
import { DEFAULT_FILTERS_VALUES } from '../src/utils/locals';
import { WallpaperDetailPage } from './WallpaperDetailPage';
import {
  ColorOptionType,
  PriceOptionType,
  SearchOptionType,
  SortByType,
  TagsOptionType,
  WallpaperCategoryType,
  CardsTypes,
  FilterCategoriesType,
} from '../src/types/types';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';

export class WallpapersListPage extends HeaderPage {
  readonly CardsHeader: BodyHeaderPage;

  readonly main: Locator;
  readonly wallpaperTitle: Locator;
  readonly noResultsHeading: Locator;
  readonly suggestedKeywordLinks: Locator;
  readonly filterCategory: Locator;
  readonly filterTag: Locator;
  readonly filterPrice: Locator;
  readonly filterColor: Locator;
  readonly filterSortBy: Locator;
  readonly resetAllBtn: Locator;
  readonly categoryFilterDialog: Locator;
  readonly colorFilterDialog: Locator;
  readonly priceFilterDialog: Locator;
  readonly sortByFilterDialog: Locator;
  readonly filtersChip: Locator;
  readonly filtersPanel: Locator;
  readonly filtersPanelBackBtn: Locator;
  readonly filtersPanelShowResultsBtn: Locator;
  readonly filtersPanelFreeCheckbox: Locator;
  readonly filtersPanelPaidCheckbox: Locator;
  readonly exploreCategoriesHeading: Locator;
  readonly subFilterLinks: Locator;

  readonly cardsContainer: Locator;
  readonly cardsAll: Locator;
  readonly cardsPremium: Locator;
  readonly cardsPremiumWithPrice: Locator;
  readonly cardsAiGenerated: Locator;
  readonly cardsFree: Locator;
  readonly loadMoreBtn: Locator;

  constructor(page: Page) {
    super(page);
    // this.Header = new HeaderPage(page);
    this.CardsHeader = new BodyHeaderPage(page);
    this.main = this.page.locator('main');
    this.wallpaperTitle = this.main.locator('h1');
    // "All"-filter no-results page (/find/<term>): heading + suggested-keyword links.
    // Note: the "Wallpapers"-filter no-results page (?keyword=<term>) shows a different, plain
    // "Couldn't find anything" heading with no suggestions - a separate empty state, not this one.
    this.noResultsHeading = this.main.getByRole('heading', { name: /couldn.?t find it/i });
    this.suggestedKeywordLinks = this.main.locator('a[href^="/wallpapers?keyword="]');
    // Exact-match regexes: once a filter is active, its applied-value chip (e.g. "Price: High to Low"
    // from Sort by) sits in the same `main button` pool and a substring hasText match picks up both.
    this.filterCategory = this.main.locator('button', { hasText: /^Category$/ });
    this.filterTag = this.main.locator('button', { hasText: /^Tag$/ });
    this.filterPrice = this.main.locator('button', { hasText: /^Price$/ });
    this.filterColor = this.main.locator('button', { hasText: /^Color$/ });
    this.filterSortBy = this.main.locator('button', { hasText: /^Sort by$/ });
    this.resetAllBtn = this.main.locator('button', { hasText: 'Reset All' });
    this.categoryFilterDialog = this.page.getByRole('dialog', { name: 'Category' });
    this.colorFilterDialog = this.page.getByRole('dialog', { name: 'Color' });
    this.priceFilterDialog = this.page.getByRole('dialog', { name: 'Price' });
    this.sortByFilterDialog = this.page.getByRole('dialog', { name: 'Sort by' });
    // Narrow-viewport layout: the inline filter buttons above collapse into a single "Filters"/"Filters
    // (N)" chip that opens a side panel. Its <h2> isn't wired as the dialog's accessible name (no
    // aria-labelledby), so filtersPanel matches on role alone rather than a name - there is only ever
    // one dialog open at a time in this flow.
    this.filtersChip = this.main.getByRole('button', { name: /^Filters(\s\(\d+\))?$/ });
    this.filtersPanel = this.page.getByRole('dialog');
    // Same icon button throughout: closes the panel from its top-level row list, or goes back to that
    // row list from a drilled-down sub-view (Categories/Colors/Tags/Price/Sort By) - always the first
    // button in the dialog, confirmed live across every view.
    this.filtersPanelBackBtn = this.filtersPanel.getByRole('button').first();
    this.filtersPanelShowResultsBtn = this.page.getByRole('button', { name: 'Show Results' });
    this.filtersPanelFreeCheckbox = this.filtersPanel.getByRole('checkbox', { name: 'Free' });
    this.filtersPanelPaidCheckbox = this.filtersPanel.getByRole('checkbox', { name: 'Paid' });
    // "Explore different wallpaper categories" section at the bottom of /wallpapers renders outside
    // <main> (a separate page section), so this is scoped to the page, not `this.main`. The row of
    // sub-filter chip links rendered right after the H1 on the /category/wallpapers/<slug> pages it
    // links to does live inside main - see subFilterLinks below.
    this.exploreCategoriesHeading = this.page.getByRole('heading', { name: 'Explore different wallpaper categories' });
    this.subFilterLinks = this.main.locator('h1 + div a');

    this.cardsContainer = this.main.locator('div[class*="CardsContainer"]').last();
    this.cardsAll = this.cardsContainer.locator(':scope > a[class*="A_link"]');
    this.cardsPremium = this.cardsAll.filter({ has: this.page.locator('div[class*="card-header"]') });
    this.cardsPremiumWithPrice = this.cardsPremium.filter({ has: this.page.locator('div[class*="card-footer"]') });
    this.cardsAiGenerated = this.cardsAll.filter({ has: this.page.locator('div[class*="card-header"] svg[aria-label="AI generated"]') });
    this.cardsFree = this.cardsAll.filter({ hasNot: this.page.locator('div[class*="card-footer"]') });
    this.loadMoreBtn = this.main.getByRole('button', { name: 'Load more' });
  }

  async open() {
    await this.gotoWallpapersWithRetry();
    await dismissCookieBanner(this.page);
  }

  /**
   * Navigates to /wallpapers, retrying if it crashes into Next.js's error-boundary screen.
   * One-shot `.isVisible()` polling only - `.waitFor()`/`.click()` here fights the
   * rejectCookieConsent addLocatorHandler (fixtures/test.ts) and hangs (confirmed live).
   */
  private async gotoWallpapersWithRetry(retries = 2) {
    const appWallpaperLoadError = this.page.getByText('a client-side exception has occurred', { exact: false });
    for (let attempt = 0; attempt <= retries; attempt++) {
      await this.page.goto('/wallpapers');
      const deadline = Date.now() + TIMEOUTS.action;
      while (!(await this.wallpaperTitle.isVisible()) && !(await appWallpaperLoadError.isVisible()) && Date.now() < deadline) {
        await this.page.waitForTimeout(100);
      }
      if (await this.wallpaperTitle.isVisible()) return;
      if (attempt === retries) throw new Error(`/wallpapers failed to render after ${retries + 1} attempts`);
    }
  }

  async getCardPrice(card: Locator): Promise<string> {
    return (await card.innerText()).trim();
  }

  async cardHasPriceBadge(card: Locator): Promise<boolean> {
    return (await card.locator('div[class*="card-footer"] [class*="badge"]').count()) > 0;
  }

  async selectCard(card: Locator) {
    await card.scrollIntoViewIfNeeded();
    await card.waitFor({ state: 'visible' });
    await card.click();
  }

  async selectCardByType(type: PriceOptionType) {
    let cardHref;
    if (type === 'Paid') {
      const CARD_PAID = this.cardsPremiumWithPrice.first();
      cardHref = await this.getCardHref(CARD_PAID);
      await this.selectCard(CARD_PAID);
    } else {
      const CARD_FREE = this.cardsFree.first();
      cardHref = await this.getCardHref(CARD_FREE);
      await this.selectCard(CARD_FREE);
    }
    await this.page.waitForURL(`**${cardHref}`, { timeout: 5000 });
  }

  async getCardTitle(card: Locator): Promise<string> {
    return (await card.getAttribute('title')) || '';
  }

  async verifyDownload(folder: string, title: string) {
    const downloadPath = `downloads/${folder}/${title}.jpg`;
    for (let attempt = 0; attempt < 10; attempt++) {
      if (existsSync(downloadPath)) {
        const fileStats = await stat(downloadPath);
        if (fileStats.size > 0) {
          console.log(`Wallpaper "${title}" downloaded successfully.`);
          return;
        }
      }
      await new Promise(res => setTimeout(res, 1000));
    }
    throw new Error(`Wallpaper "${title}" was not downloaded or is empty.`);
  }

  async downloadFreeWallpapers(folder: string, length: number) {
    const cards = (await this.cardsFree.all()).slice(0, length);
    for (const card of cards) {
      const title = await this.getCardTitle(card);
      const titleWithoutSpaces = removeSpaces(title);
      await this.selectCard(card);
      const wallpaperPage = new WallpaperDetailPage(this.page);
      await wallpaperPage.saveFreeWallpaper(folder, titleWithoutSpaces);
      await this.verifyDownload(folder, titleWithoutSpaces);
      await this.page.goBack();
    }
  }

  async validateCommonWallpaper(card: Locator) {
    await expect(card).toHaveAttribute('href');
    await expect(card).toHaveAttribute('aria-label');
    await expect(card).toHaveAttribute('title');

    const titleAttribute = await card.getAttribute('title');
    const ariaLabelAttribute = await card.getAttribute('aria-label');
    // eslint-disable-next-line playwright/prefer-web-first-assertions -- comparing two dynamic attributes to each other has no single toHaveAttribute equivalent
    expect(titleAttribute).toBe(ariaLabelAttribute);
    await expect(card).not.toHaveAttribute('title', '');
    await expect(card).not.toHaveAttribute('aria-label', '');

    const hrefValue = (await card.getAttribute('href')) || '';
    const regex = /^\/wallpapers\/[a-f0-9\-]{36}$/; // check GUID (Globally Unique Identifier)
    if (!regex.test(hrefValue)) throw new Error('Wallpaper contains invalid href value');
  }

  async validatePremiumWallpaper(element: Locator) {
    // Header
    const cardHeader = element.locator('div[class*="card-header"]');
    const headerBadge = cardHeader.locator('[class*="badge"]');
    await expect(headerBadge).toBeVisible();

    // Footer
    const cardFooter = element.locator('div[class*="card-footer"]');
    const footerBadge = cardFooter.locator('[class*="badge"]');
    await expect(footerBadge).toBeVisible();

    // Check that text in card-footer contains only digits
    const footerText = await footerBadge.innerText();
    const isDigitsOnly = /^\d+$/.test(footerText);
    if (!isDigitsOnly) throw new Error('Card-footer badge contains non-digit characters');
  }

  async validateWallpapers(byType: CardsTypes) {
    const validateWallpaperType = async (cards: Locator[], validatePremium = false) => {
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) {
        await this.validateCommonWallpaper(card);
        if (validatePremium) {
          await this.validatePremiumWallpaper(card);
        }
      }
    };

    // Validating premium cards
    if (byType === 'all' || byType === 'premium') {
      const premiumCards = await this.cardsPremium.all();
      await validateWallpaperType(premiumCards, true);
    }

    // Validating free cards
    if (byType === 'all' || byType === 'free') {
      const freeCards = await this.cardsFree.all();
      await validateWallpaperType(freeCards, false);
    }
  }

  async validateCardExistance(cards: PriceOptionType, exist: boolean) {
    const cardsList = cards === 'Free' ? await this.cardsFree.all() : await this.cardsPremiumWithPrice.all();
    if (exist) {
      expect(cardsList.length).toBeGreaterThan(0);
    } else {
      expect(cardsList).toHaveLength(0);
    }
  }

  async validateWallpapersToHaveLabels(label: string | string[]) {
    const CARDS = await this.cardsAll.all();

    const EXPECTED_LABELS_ARR = Array.isArray(label) ? label : label.split(' ');
    EXPECTED_LABELS_ARR.forEach((text, index) => (EXPECTED_LABELS_ARR[index] = text.toLowerCase()));

    // Track which labels have been found
    const foundLabels = new Set<string>();

    for (const CARD of CARDS) {
      await CARD.waitFor({ state: 'attached' }); // Wait for each element to be attached
      const cardLabel = (await CARD.getAttribute('aria-label'))?.toLowerCase() || '';

      // Check if any expected label exists in this card label
      for (const expectedLabel of EXPECTED_LABELS_ARR) {
        if (cardLabel.includes(expectedLabel)) {
          foundLabels.add(expectedLabel);
        }

        // Stop early if all labels are found
        if (foundLabels.size === EXPECTED_LABELS_ARR.length) return;
      }
    }

    // Find which labels are missing
    const missingLabels = EXPECTED_LABELS_ARR.filter(l => !foundLabels.has(l));
    if (missingLabels.length > 0) throw new Error(`Missing labels in cards: ${missingLabels.join(',')} from ${EXPECTED_LABELS_ARR.join(',')}`);
  }

  async getCardHref(card: Locator): Promise<string> {
    await card.waitFor({ state: 'attached' });
    const href = (await card.getAttribute('href')) || '';
    return href;
  }

  async getCardsHref(): Promise<string[]> {
    const cards = await this.cardsAll.all();
    const hrefs = [];
    for (const card of cards) {
      hrefs.push(await this.getCardHref(card));
    }
    return hrefs.filter(Boolean);
  }

  compareCardsHrefArrays(currentHrefArr: string[], previousHrefArr: string[]) {
    if (currentHrefArr.length < previousHrefArr.length) throw new Error('Current href array is shorter than previous one');

    for (let i = 0; i < previousHrefArr.length; i++) {
      if (currentHrefArr[i] !== previousHrefArr[i]) throw new Error('Order of hrefs does not match between previous and current arrays');
    }
  }

  async waitForCardsToUpdate(hrefsBefore: string[]) {
    await expect.poll(() => this.getCardsHref(), { timeout: TIMEOUTS.expect, intervals: [500] }).not.toEqual(hrefsBefore);
  }

  async searchAndWaitForUpdate(value: string, filter: SearchOptionType = 'All') {
    const hrefsBefore = await this.getCardsHref();
    await this.search(value, filter);
    await this.waitForCardsToUpdate(hrefsBefore);
  }

  async scrollDownGradually(step = 200, delay = 300, extraTicksAtBottom = 1) {
    const viewport = this.page.viewportSize();
    if (viewport) await this.page.mouse.move(viewport.width / 2, viewport.height / 2);

    let previousScrollY = -1;
    let ticksAtBottom = 0;
    // Keep nudging a few extra ticks after reaching the bottom - some lazy-load triggers
    // need lingering scroll/wheel events near the bottom, not just the final position.
    while (ticksAtBottom <= extraTicksAtBottom) {
      const currentScrollY = await this.page.evaluate(() => window.scrollY);
      ticksAtBottom = currentScrollY === previousScrollY ? ticksAtBottom + 1 : 0;
      previousScrollY = currentScrollY;
      await this.page.mouse.wheel(0, step);
      await this.page.waitForTimeout(delay);
    }
  }

  async validateAutoLoadImagesOnScrollDown(checkLabel?: string[]) {
    const loadBtn = this.loadMoreBtn;
    await expect(loadBtn).toBeAttached({ attached: false });
    let cardsCount = await this.cardsAll.count();
    let cardsHrefArr = await this.getCardsHref();

    const maxAttempts = 6;
    let attempts = 0;
    while (!(await loadBtn.isVisible()) && attempts < maxAttempts) {
      // Scroll down gradually, like a real user, so scroll/intersection listeners fire correctly
      await this.scrollDownGradually();

      // New cards first render as skeletons, then swap in a few seconds later - poll instead of a fixed wait
      await expect.poll(() => this.cardsAll.count(), { timeout: 10000, intervals: [500] }).toBeGreaterThan(cardsCount);

      // Check new cards are loaded and previous cards are preserved
      cardsCount = await this.cardsAll.count();
      const cardsHrefNew = await this.getCardsHref();
      this.compareCardsHrefArrays(cardsHrefNew, cardsHrefArr);
      cardsHrefArr = cardsHrefNew;

      // Check if 'Load More' button is visible and enabled
      if ((await loadBtn.isVisible()) && (await loadBtn.isEnabled())) {
        await loadBtn.scrollIntoViewIfNeeded();
        await loadBtn.hover();
        if (checkLabel) await this.validateWallpapersToHaveLabels(checkLabel);
        break;
      }

      attempts++;
    }
  }

  async waitForFilterToBeApplied(filterName: string) {
    const appliedFilterBtn = this.page.locator('button', { hasText: new RegExp(filterName, 'i') });
    await appliedFilterBtn.waitFor({ state: 'visible' });
  }

  async filterByCategories(categoryOptions: WallpaperCategoryType[]) {
    await this.filterCategory.click();
    await expect(this.categoryFilterDialog).toBeVisible();

    // Select all options
    for (const categoryOption of categoryOptions) {
      const categoryLabel = this.categoryFilterDialog.getByRole('option', { name: categoryOption });
      await categoryLabel.scrollIntoViewIfNeeded();
      await categoryLabel.click();
      await this.waitForFilterToBeApplied(categoryOption);
    }

    // Close filter
    await this.filterCategory.click({ force: true });
    await expect(this.categoryFilterDialog).not.toBeAttached();
  }

  async isCategorySelected(category: WallpaperCategoryType): Promise<boolean> {
    await this.filterCategory.click();
    await expect(this.categoryFilterDialog).toBeVisible();
    const isSelected = (await this.categoryFilterDialog.getByRole('option', { name: category }).getAttribute('aria-checked')) === 'true';
    await this.filterCategory.click({ force: true });
    await expect(this.categoryFilterDialog).not.toBeAttached();
    return isSelected;
  }

  async getCardPriceBadgeText(card: Locator): Promise<string> {
    const footerBadge = card.locator('div[class*="card-footer"] [class*="badge"]');
    return (await footerBadge.innerText()).trim();
  }

  async getCardPriceBadgeTextAsNumber(card: Locator): Promise<number> {
    return parseInt(await this.getCardPriceBadgeText(card), 10);
  }

  async expectCardPricesNonIncreasing(limit = 10) {
    const cards = (await this.cardsAll.all()).slice(0, limit);
    const prices: number[] = [];
    for (const card of cards) {
      prices.push(await this.getCardPriceBadgeTextAsNumber(card));
    }
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]!).toBeLessThanOrEqual(prices[i - 1]!);
    }
  }

  async filterByColor(colors: ColorOptionType[]) {
    await this.filterColor.click();
    await expect(this.colorFilterDialog).toBeVisible();

    // Select all options
    for (const color of colors) {
      const colorLabel = this.colorFilterDialog.getByRole('option', { name: color });
      await colorLabel.scrollIntoViewIfNeeded();
      await colorLabel.click();
      await this.waitForFilterToBeApplied(color);
    }

    // Close filter
    await this.filterColor.click({ force: true });
    await expect(this.colorFilterDialog).not.toBeAttached();
  }

  async isColorSelected(color: ColorOptionType): Promise<boolean> {
    await this.filterColor.click();
    await expect(this.colorFilterDialog).toBeVisible();
    const isSelected = (await this.colorFilterDialog.getByRole('option', { name: color }).getAttribute('aria-checked')) === 'true';
    await this.filterColor.click({ force: true });
    await expect(this.colorFilterDialog).not.toBeAttached();
    return isSelected;
  }

  async filterByTag(tags: TagsOptionType[]) {
    await this.filterTag.click();
    const tagDialog = this.page.getByRole('dialog');
    await expect(tagDialog).toBeVisible();

    // Select all options
    for (const tag of tags) {
      const tagLabel = tagDialog.getByRole('option', { name: tag, exact: true });
      await tagLabel.scrollIntoViewIfNeeded();
      await tagLabel.click();
      await this.waitForFilterToBeApplied(tag);
    }

    // Close filter
    await this.filterTag.click({ force: true });
    await expect(tagDialog).not.toBeAttached();
  }

  async filterByPrice(prices: PriceOptionType[]) {
    await this.filterPrice.click();
    await expect(this.priceFilterDialog).toBeVisible();

    // Select all options
    for (const price of prices) {
      const priceLabel = this.priceFilterDialog.getByRole('option', { name: price });
      await priceLabel.scrollIntoViewIfNeeded();
      await priceLabel.click();
      await this.waitForFilterToBeApplied(price);
    }

    // Close filter
    await this.filterPrice.click({ force: true });
    await expect(this.priceFilterDialog).not.toBeAttached();
  }

  async setPriceRange(from: number, to: number) {
    await this.filterPrice.click();
    await expect(this.priceFilterDialog).toBeVisible();

    // From/To are numeric inputs, not the Free/Paid checkbox options filterByPrice handles above;
    // each value only commits to the URL once the field is blurred, and blurring both in a row
    // races the two commits (seen live as `minPrice=NaN`) - wait for each to land before the next.
    const fromInput = this.priceFilterDialog.getByRole('menuitem', { name: 'From' });
    const toInput = this.priceFilterDialog.getByRole('menuitem', { name: 'To' });
    await fromInput.fill(String(from));
    await fromInput.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`minPrice=${from}`));
    await toInput.fill(String(to));
    await toInput.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`maxPrice=${to}`));

    // Close filter
    await this.filterPrice.click({ force: true });
    await expect(this.priceFilterDialog).not.toBeAttached();
  }

  async filterBySortBy(option: SortByType) {
    const hrefsBefore = await this.getCardsHref();
    await this.filterSortBy.click();
    await expect(this.sortByFilterDialog).toBeVisible();
    const sortByLabel = this.sortByFilterDialog.getByRole('menuitemradio', { name: option });
    await sortByLabel.scrollIntoViewIfNeeded();
    await sortByLabel.click();
    await expect(this.sortByFilterDialog).not.toBeAttached();
    await this.waitForCardsToUpdate(hrefsBefore);
  }

  async isSortBySelected(option: SortByType): Promise<boolean> {
    await this.filterSortBy.click();
    await expect(this.sortByFilterDialog).toBeVisible();
    const isSelected = (await this.sortByFilterDialog.getByRole('menuitemradio', { name: option }).getAttribute('aria-checked')) === 'true';
    await this.filterSortBy.click({ force: true });
    await expect(this.sortByFilterDialog).not.toBeAttached();
    return isSelected;
  }

  async getPriceFromValue(): Promise<string> {
    await this.filterPrice.click();
    await expect(this.priceFilterDialog).toBeVisible();
    const value = await this.priceFilterDialog.getByRole('menuitem', { name: 'From' }).inputValue();
    await this.filterPrice.click({ force: true });
    await expect(this.priceFilterDialog).not.toBeAttached();
    return value;
  }

  exploreCategoryLink(category: string): Locator {
    return this.exploreCategoriesHeading.locator('..').getByRole('link', { name: category, exact: true });
  }

  // Picks a sub-filter chip link on a /category/wallpapers/<slug> page that isn't a link back to the
  // current page - the current category's own chip can appear anywhere in that row.
  async selectDifferentSubFilter() {
    const currentPath = new URL(this.page.url()).pathname;
    const firstHref = await this.subFilterLinks.first().getAttribute('href');
    const link = firstHref === currentPath ? this.subFilterLinks.nth(1) : this.subFilterLinks.first();
    await link.click();
  }

  async clickResetAllFilters() {
    const button = this.resetAllBtn;
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const parent = this.resetAllBtn.locator('..');
    await parent.locator(':nth-child(2)').waitFor({ state: 'detached', timeout: 10000 });
  }

  // Narrow-viewport Filters panel (see filtersChip/filtersPanel above). One row-lookup helper plus one
  // validator per sub-view, each reusable with optional expected state so the same call can check a
  // tab's default/empty contents or that a selection persisted after reopening.

  filtersPanelRow(group: FilterCategoriesType): Locator {
    return this.filtersPanel.getByRole('button', { name: new RegExp(`^${group}`, 'i') });
  }

  async validateFiltersPanel(expected: Partial<{ categories: string; colors: string; tags: string; price: string; sortBy: string }> = {}) {
    await expect(this.filtersPanel).toBeVisible();
    await expect(this.filtersPanel.getByRole('heading', { name: 'Filters' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: 'Clear all' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: `Categories ${expected.categories ?? 'Any'}` })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: `Colors ${expected.colors ?? 'Any'}` })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: `Tags ${expected.tags ?? 'Any'}` })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: `Price ${expected.price ?? 'Any'}` })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: `Sort By ${expected.sortBy ?? 'Relevance'}` })).toBeVisible();
    await expect(this.filtersPanelShowResultsBtn).toBeVisible();
  }

  async validateCategoriesFilterPanelView() {
    await expect(this.filtersPanel.getByRole('heading', { name: 'Categories' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('textbox', { name: 'Search' })).toBeVisible();
  }

  async validateColorsFilterPanelView() {
    await expect(this.filtersPanel.getByRole('heading', { name: 'Colors' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: 'Clear' })).toBeVisible();
  }

  async validateTagsFilterPanelView() {
    await expect(this.filtersPanel.getByRole('heading', { name: 'Tags' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('combobox', { name: 'Search' })).toBeVisible();
  }

  async validateSortByFilterPanelView(expectedChecked?: SortByType) {
    await expect(this.filtersPanel.getByRole('heading', { name: 'Sort By' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: 'Clear' })).toBeVisible();
    if (expectedChecked) await expect(this.filtersPanel.getByRole('radio', { name: expectedChecked })).toBeChecked();
  }

  async validatePriceFilterPanelView(expected?: { free?: boolean; paid?: boolean }) {
    await expect(this.filtersPanel.getByRole('heading', { name: 'Price' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('button', { name: 'Clear' })).toBeVisible();
    await expect(this.filtersPanelFreeCheckbox).toBeVisible();
    await expect(this.filtersPanelPaidCheckbox).toBeVisible();
    if (expected?.free !== undefined) await expect(this.filtersPanelFreeCheckbox).toBeChecked({ checked: expected.free });
    if (expected?.paid !== undefined) await expect(this.filtersPanelPaidCheckbox).toBeChecked({ checked: expected.paid });
    await expect(this.filtersPanel.getByRole('spinbutton', { name: 'From' })).toBeVisible();
    await expect(this.filtersPanel.getByRole('spinbutton', { name: 'To' })).toBeVisible();
  }

  async openFiltersPanelTab(group: FilterCategoriesType) {
    await this.filtersPanelRow(group).click();
    switch (group) {
      case 'Categories':
        return this.validateCategoriesFilterPanelView();
      case 'Colors':
        return this.validateColorsFilterPanelView();
      case 'Tags':
        return this.validateTagsFilterPanelView();
      case 'Price':
        return this.validatePriceFilterPanelView();
      case 'Sort by':
        return this.validateSortByFilterPanelView();
    }
  }

  filtersPanelOption(group: FilterCategoriesType, option: string): Locator {
    const role = { Categories: 'checkbox', Colors: 'checkbox', Price: 'checkbox', Tags: 'option', 'Sort by': 'radio' } as const;
    return this.filtersPanel.getByRole(role[group], { name: option, exact: true });
  }

  async expectFiltersPanelOptionSelected(group: FilterCategoriesType, option: string) {
    const locator = this.filtersPanelOption(group, option);
    if (group === 'Tags') await expect(locator).toHaveAttribute('aria-selected', 'true');
    else await expect(locator).toBeChecked();
  }

  async expectFiltersPanelRowDefault(group: FilterCategoriesType, isDefault = true) {
    const row = this.filtersPanelRow(group);
    const defaultName = `${group} ${DEFAULT_FILTERS_VALUES[group][0]}`;
    if (isDefault) await expect(row).toHaveAccessibleName(defaultName, { ignoreCase: true });
    else await expect(row).not.toHaveAccessibleName(defaultName, { ignoreCase: true });
  }

  // The panel applies every change live (URL and cards update behind the open dialog), so each helper
  // below checks the result right after its own action, then that the row and the reopened tab kept it.
  async applyFiltersPanelOption(group: FilterCategoriesType, option: string, urlContains: RegExp) {
    const hrefsBefore = await this.getCardsHref();
    await this.openFiltersPanelTab(group);
    await this.filtersPanelOption(group, option).click();
    await expect(this.page).toHaveURL(urlContains);
    await this.waitForCardsToUpdate(hrefsBefore);
    expect((await this.getCardsHref()).length).toBeGreaterThan(0);

    await this.filtersPanelBackBtn.click();
    await this.expectFiltersPanelRowDefault(group, false);
    await this.openFiltersPanelTab(group);
    await this.expectFiltersPanelOptionSelected(group, option);
    await this.filtersPanelBackBtn.click();
  }

  // From/To only commit to the URL once blurred, and blurring both in a row races the two commits
  // (`minPrice=NaN`, same as setPriceRange above) - so each value is committed and awaited on its own.
  async applyFiltersPanelPriceRange(from: number, to: number) {
    const hrefsBefore = await this.getCardsHref();
    await this.openFiltersPanelTab('Price');
    const fromInput = this.filtersPanel.getByRole('spinbutton', { name: 'From' });
    const toInput = this.filtersPanel.getByRole('spinbutton', { name: 'To' });
    await fromInput.fill(String(from));
    await fromInput.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`minPrice=${from}`));
    await toInput.fill(String(to));
    await toInput.press('Tab');
    await expect(this.page).toHaveURL(new RegExp(`maxPrice=${to}`));
    await this.waitForCardsToUpdate(hrefsBefore);
    expect((await this.getCardsHref()).length).toBeGreaterThan(0);

    await this.filtersPanelBackBtn.click();
    await this.expectFiltersPanelRowDefault('Price', false);
    await this.openFiltersPanelTab('Price');
    await expect(fromInput).toHaveValue(String(from));
    await expect(toInput).toHaveValue(String(to));
    await this.filtersPanelBackBtn.click();
  }

  async clearFiltersPanelTab(group: FilterCategoriesType) {
    const hrefsBefore = await this.getCardsHref();
    await this.openFiltersPanelTab(group);
    await this.filtersPanel.getByRole('button', { name: 'Clear', exact: true }).click();
    await this.waitForCardsToUpdate(hrefsBefore);
    await this.filtersPanelBackBtn.click();
    await this.expectFiltersPanelRowDefault(group);
  }

  async clearAllFiltersPanel() {
    const hrefsBefore = await this.getCardsHref();
    await this.filtersPanel.getByRole('button', { name: 'Clear all' }).click();
    await this.waitForCardsToUpdate(hrefsBefore);
    await this.validateFiltersPanel();
  }
}
