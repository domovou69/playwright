import { expect, Locator, Page } from '@playwright/test';
import { HeaderPage } from './HeaderPage';
import { BodyHeaderPage } from './MainHeaderPage';
import { removeSpaces } from '../src/utils/helper';
import { WallpaperDetailPage } from './WallpaperDetailPage';
import { ColorOptionType, PriceOptionType, SortByType, TagsOptionType, WallpaperCategoryType, CardsTypes } from '../src/types/types';

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

  readonly cardsContainer: Locator;
  readonly cardsAll: Locator;
  readonly cardsPremium: Locator;
  readonly cardsPremiumWithPrice: Locator;
  readonly cardsFree: Locator;
  readonly loadMoreBtn: Locator;

  constructor(readonly page: Page) {
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

    this.cardsContainer = this.main.locator('div[class*="CardsContainer"]').last();
    this.cardsAll = this.cardsContainer.locator(':scope > a[class*="A_link"]');
    this.cardsPremium = this.cardsAll.filter({ has: this.page.locator('div[class*="card-header"]') });
    this.cardsPremiumWithPrice = this.cardsPremium.filter({ has: this.page.locator('div[class*="card-footer"]') });
    this.cardsFree = this.cardsAll.filter({ hasNot: this.page.locator('div[class*="card-footer"]') });
    this.loadMoreBtn = this.main.getByRole('button', { name: 'Load more' });
  }

  async getCardPrice(card: Locator): Promise<string> {
    return (await card.innerText()).trim();
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

  async downloadFreeWallpapers(folder: string, length: number) {
    const cards = (await this.cardsFree.all()).slice(0, length);
    for (const card of cards) {
      const title = await this.getCardTitle(card);
      const titleWithoutSpaces = removeSpaces(title);
      await this.selectCard(card);
      const wallpaperPage = new WallpaperDetailPage(this.page);
      await wallpaperPage.saveFreeWallpaper(folder, titleWithoutSpaces);
      await this.page.goBack();
    }
  }

  async validateCommonWallpaper(card: Locator) {
    expect(card).toHaveAttribute('href');
    expect(card).toHaveAttribute('aria-label');
    expect(card).toHaveAttribute('title');

    const titleAttribute = await card.getAttribute('title');
    const ariaLabelAttribute = await card.getAttribute('aria-label');
    expect(titleAttribute).toBe(ariaLabelAttribute);
    expect(titleAttribute).not.toBe('');
    expect(ariaLabelAttribute).not.toBe('');

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
    let cardsList: Locator[];
    cards === 'Free' ? (cardsList = await this.cardsFree.all()) : (cardsList = await this.cardsPremiumWithPrice.all());
    exist ? expect(cardsList.length).toBeGreaterThan(0) : expect(cardsList.length).toBe(0);
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
    if (missingLabels.length > 0) throw new Error(`Missing labels in cards: ${missingLabels.join(',')} from ${EXPECTED_LABELS_ARR}`);
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
    return hrefs.filter(Boolean) as string[];
  }

  async compareCardsHrefArrays(currentHrefArr: string[], previousHrefArr: string[]) {
    if (currentHrefArr.length < previousHrefArr.length) throw new Error('Current href array is shorter than previous one');

    for (let i = 0; i < previousHrefArr.length; i++) {
      if (currentHrefArr[i] !== previousHrefArr[i]) throw new Error('Order of hrefs does not match between previous and current arrays');
    }
  }

  async waitForCardsToUpdate(cardsListBefore: Locator[]) {
    let cardsListAfter: Locator[];
    let retries = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 500;

    do {
      // Wait for a brief moment to allow for UI updates
      await this.page.waitForTimeout(RETRY_DELAY);

      // Get the updated list of cards
      cardsListAfter = await this.cardsAll.all();

      // Compare each element in the previous and updated list
      const hasChanged = cardsListBefore.some((cardBefore, index) => {
        return cardBefore !== cardsListAfter[index];
      });

      if (hasChanged) return;

      retries++;
    } while (retries < MAX_RETRIES);

    throw new Error('Cards list did not update after waiting');
  }

  async validateAutoLoadImagesOnScrollDown(checkLabel?: string[]) {
    const loadBtn = this.loadMoreBtn;
    await expect(loadBtn).toBeAttached({ attached: false });
    let cardsCount = await this.cardsAll.count();
    let cardsHrefArr = await this.getCardsHref();

    const maxAttempts = 6;
    let attempts = 0;
    while (!(await loadBtn.isVisible()) && attempts < maxAttempts) {
      // Scrol to the footer wait for image to load
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(1000);

      // Check new cards are loaded and previous cards are preserved
      let cardsCountNew = await this.cardsAll.count();
      expect(cardsCountNew).toBeGreaterThan(cardsCount);
      cardsCount = cardsCountNew;
      let cardsHrefNew = await this.getCardsHref();
      await this.compareCardsHrefArrays(cardsHrefNew, cardsHrefArr);
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
    const categoryDialog = this.page.getByRole('dialog', { name: 'Category' });
    await expect(categoryDialog).toBeVisible();

    // Select all options
    for (const categoryOption of categoryOptions) {
      const categoryLabel = categoryDialog.getByRole('option', { name: categoryOption });
      await categoryLabel.scrollIntoViewIfNeeded();
      await categoryLabel.click();
      await this.waitForFilterToBeApplied(categoryOption);
    }

    // Close filter
    await this.filterCategory.click({ force: true });
    await expect(categoryDialog).not.toBeAttached();
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
      const tagLabel = tagDialog.getByRole('option', { name: tag });
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
    await this.filterSortBy.click();
    const sortByDialog = this.page.getByRole('dialog', { name: 'Sort by' });
    await expect(sortByDialog).toBeVisible();
    const sortByLabel = sortByDialog.getByRole('menuitemradio', { name: option });
    await sortByLabel.scrollIntoViewIfNeeded();
    await sortByLabel.click();
    await expect(sortByDialog).not.toBeAttached();
    await this.page.waitForTimeout(1000);
  }

  async clickResetAllFilters() {
    const button = this.resetAllBtn;
    await button.scrollIntoViewIfNeeded();
    await button.click();
    const parent = this.resetAllBtn.locator('..');
    await parent.locator(':nth-child(2)').waitFor({ state: 'detached', timeout: 10000 });
  }
}
