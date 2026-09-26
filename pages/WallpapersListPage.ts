import { expect, Locator, Page } from '@playwright/test';
import { HeaderPage } from './HeaderPage';
import { BodyHeaderPage } from './MainHeaderPage';
import { removeSpaces } from '../src/utils/helper';
import { WallpaperDetailPage } from './WallpaperDetailPage';
import {
  ColorOptionType,
  PriceOptionType,
  SearchOptionType,
  SortByType,
  TagsOptionType,
  WallpaperCategoryType,
  CardsTypes,
} from '../src/types/types';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';

export class WallpapersListPage extends HeaderPage {
  readonly CardsHeader: BodyHeaderPage;

  readonly main: Locator;
  readonly wallpaperTitle: Locator;
  readonly filterCategory: Locator;
  readonly filterTag: Locator;
  readonly filterPrice: Locator;
  readonly filterColor: Locator;
  readonly filterSortBy: Locator;
  readonly resetAllBtn: Locator;
  readonly categoryFilterDialog: Locator;

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
    this.filterCategory = this.main.locator('button', { hasText: 'Category' });
    this.filterTag = this.main.locator('button', { hasText: 'Tag' });
    this.filterPrice = this.main.locator('button', { hasText: 'Price' });
    this.filterColor = this.main.locator('button', { hasText: 'Color' });
    this.filterSortBy = this.main.locator('button', { hasText: 'Sort by' });
    this.resetAllBtn = this.main.locator('button', { hasText: 'Reset All' });
    this.categoryFilterDialog = this.page.getByRole('dialog', { name: 'Category' });

    this.cardsContainer = this.main.locator('div[class*="CardsContainer"]').last();
    this.cardsAll = this.cardsContainer.locator(':scope > a[class*="A_link"]');
    this.cardsPremium = this.cardsAll.filter({ has: this.page.locator('div[class*="card-header"]') });
    this.cardsPremiumWithPrice = this.cardsPremium.filter({ has: this.page.locator('div[class*="card-footer"]') });
    this.cardsAiGenerated = this.cardsAll.filter({ has: this.page.locator('div[class*="card-header"] svg[aria-label="AI generated"]') });
    this.cardsFree = this.cardsAll.filter({ hasNot: this.page.locator('div[class*="card-footer"]') });
    this.loadMoreBtn = this.main.getByRole('button', { name: 'Load more' });
  }

  async open() {
    await this.page.goto('/wallpapers');
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
    await expect.poll(() => this.getCardsHref(), { timeout: 5000, intervals: [500] }).not.toEqual(hrefsBefore);
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

  async filterByColor(colors: ColorOptionType[]) {
    await this.filterColor.click();
    const colorDialog = this.page.getByRole('dialog', { name: 'Color' });
    await expect(colorDialog).toBeVisible();

    // Select all options
    for (const color of colors) {
      const colorLabel = colorDialog.getByRole('option', { name: color });
      await colorLabel.scrollIntoViewIfNeeded();
      await colorLabel.click();
      await this.waitForFilterToBeApplied(color);
    }

    // Close filter
    await this.filterColor.click({ force: true });
    await expect(colorDialog).not.toBeAttached();
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
    const priceDialog = this.page.getByRole('dialog', { name: 'Price' });
    await expect(priceDialog).toBeVisible();

    // Select all options
    for (const price of prices) {
      const priceLabel = priceDialog.getByRole('option', { name: price });
      await priceLabel.scrollIntoViewIfNeeded();
      await priceLabel.click();
      await this.waitForFilterToBeApplied(price);
    }

    // Close filter
    await this.filterPrice.click({ force: true });
    await expect(priceDialog).not.toBeAttached();
  }

  async filterBySortBy(option: SortByType) {
    const hrefsBefore = await this.getCardsHref();
    await this.filterSortBy.click();
    const sortByDialog = this.page.getByRole('dialog', { name: 'Sort by' });
    await expect(sortByDialog).toBeVisible();
    const sortByLabel = sortByDialog.getByRole('menuitemradio', { name: option });
    await sortByLabel.scrollIntoViewIfNeeded();
    await sortByLabel.click();
    await expect(sortByDialog).not.toBeAttached();
    await this.waitForCardsToUpdate(hrefsBefore);
  }

  async clickResetAllFilters() {
    const button = this.resetAllBtn;
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const parent = this.resetAllBtn.locator('..');
    await parent.locator(':nth-child(2)').waitFor({ state: 'detached', timeout: 10000 });
  }
}
