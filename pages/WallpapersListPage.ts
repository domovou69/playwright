import { expect, Locator, Page, test } from '@playwright/test';
import { HeaderPage } from './HeaderPage';
import { BodyHeaderPage } from './MainHeaderPage';
import { dismissCookieBanner } from '../src/utils/helper';
import { TIMEOUTS } from '../src/config/timeouts';
import { validateCardLink } from './CardLinkValidator';
import { FiltersBar } from './FiltersBar';
import { FilterDrawer } from './FilterDrawer';
import { DownloadFlow } from './DownloadFlow';
import { CardListScroller } from './CardListScroller';
import { ExploreCategories } from './ExploreCategories';
import { PriceOptionType, SearchOptionType, CardsTypes } from '../src/types/types';

export class WallpapersListPage extends HeaderPage {
  readonly CardsHeader: BodyHeaderPage;
  readonly filtersBar: FiltersBar;
  readonly filterDrawer: FilterDrawer;
  readonly downloadFlow: DownloadFlow;

  readonly scroller: CardListScroller;
  readonly explore: ExploreCategories;

  readonly main: Locator;
  readonly wallpaperTitle: Locator;
  readonly noResultsHeading: Locator;
  readonly suggestedKeywordLinks: Locator;
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
    this.filtersBar = new FiltersBar(page, this);
    this.filterDrawer = new FilterDrawer(page, this);
    this.downloadFlow = new DownloadFlow(page, this);
    // "All"-filter no-results page (/find/<term>): heading + suggested-keyword links.
    // Note: the "Wallpapers"-filter no-results page (?keyword=<term>) shows a different, plain
    // "Couldn't find anything" heading with no suggestions - a separate empty state, not this one.
    this.noResultsHeading = this.main.getByRole('heading', { name: /couldn.?t find it/i });
    this.suggestedKeywordLinks = this.main.locator('a[href^="/wallpapers?keyword="]');
    // "Explore different wallpaper categories" section at the bottom of /wallpapers renders outside
    // <main> (a separate page section), so this is scoped to the page, not `this.main`. The row of
    // sub-filter chip links rendered right after the H1 on the /category/wallpapers/<slug> pages it
    // links to does live inside main - see subFilterLinks below.
    this.explore = new ExploreCategories(page, this.main, 'wallpaper');
    this.exploreCategoriesHeading = this.explore.heading;
    this.subFilterLinks = this.explore.subFilterLinks;

    this.cardsContainer = this.main.locator('div[class*="CardsContainer"]').last();
    this.cardsAll = this.cardsContainer.locator(':scope > a[class*="A_link"]');
    this.cardsPremium = this.cardsAll.filter({ has: this.page.locator('div[class*="card-header"]') });
    this.cardsPremiumWithPrice = this.cardsPremium.filter({ has: this.page.locator('div[class*="card-footer"]') });
    this.cardsAiGenerated = this.cardsAll.filter({ has: this.page.locator('div[class*="card-header"] svg[aria-label="AI generated"]') });
    this.cardsFree = this.cardsAll.filter({ hasNot: this.page.locator('div[class*="card-footer"]') });
    this.scroller = new CardListScroller(page, this.cardsAll, this.main);
    this.loadMoreBtn = this.scroller.loadMoreBtn;
  }

  // Any /wallpapers URL (deep link, detail page): the cookie banner shows up a moment after load, and if a
  // test starts interacting before it is dismissed, the rejectCookieConsent handler clicks it mid-test -
  // outside an open modal or dropdown, which closes them. Navigate through here, not page.goto().
  async open(path = '/wallpapers') {
    await this.gotoWallpapersWithRetry(path);
    await dismissCookieBanner(this.page);
  }

  /**
   * Navigates to `path`, retrying if it crashes into Next.js's error-boundary screen.
   * One-shot `.isVisible()` polling only - `.waitFor()`/`.click()` here fights the
   * rejectCookieConsent addLocatorHandler (fixtures/test.ts) and hangs (confirmed live).
   */
  private async gotoWallpapersWithRetry(path: string, retries = 2) {
    const appWallpaperLoadError = this.page.getByText('a client-side exception has occurred', { exact: false });
    for (let attempt = 0; attempt <= retries; attempt++) {
      await this.page.goto(path);
      const deadline = Date.now() + TIMEOUTS.action;
      while (!(await this.wallpaperTitle.isVisible()) && !(await appWallpaperLoadError.isVisible()) && Date.now() < deadline) {
        await this.page.waitForTimeout(100);
      }
      if (await this.wallpaperTitle.isVisible()) return;
      const reason = (await appWallpaperLoadError.isVisible())
        ? 'Next.js client-side error screen'
        : `no wallpaper title within ${TIMEOUTS.action} ms`;
      test.info().annotations.push({ type: 'navigation-retry', description: `${path} attempt ${attempt + 1}: ${reason}` });
      if (attempt === retries) throw new Error(`${path} failed to render after ${retries + 1} attempts`);
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

  async validateCommonWallpaper(card: Locator) {
    await validateCardLink(card, 'wallpapers', title => title);
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

  async validateFirstCards(limit: number) {
    const count = await this.cardsAll.count();
    const cards = Array.from({ length: Math.min(limit, count) }, (_, i) => this.cardsAll.nth(i));
    expect(cards.length).toBeGreaterThan(0);

    let premiumWithPriceCount = 0;
    for (const card of cards) {
      await this.validateCommonWallpaper(card);

      if (await this.cardHasPriceBadge(card)) {
        await this.validatePremiumWallpaper(card);
        premiumWithPriceCount++;
      } else {
        await expect(card.locator('div[class*="card-footer"]')).not.toBeAttached();
      }
    }
    expect(premiumWithPriceCount).toBeGreaterThan(0);
  }

  async validateAllCardsPremiumWithPrice() {
    const allCount = await this.cardsAll.count();
    expect(allCount).toBeGreaterThan(0);
    await expect(this.cardsPremiumWithPrice).toHaveCount(allCount);
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

  getCardsHref() {
    return this.scroller.getCardsHref();
  }

  compareCardsHrefArrays(currentHrefArr: string[], previousHrefArr: string[]) {
    this.scroller.compareCardsHrefArrays(currentHrefArr, previousHrefArr);
  }

  waitForCardsToUpdate(hrefsBefore: string[]) {
    return this.scroller.waitForCardsToUpdate(hrefsBefore);
  }

  async searchAndWaitForUpdate(value: string, filter: SearchOptionType = 'All') {
    const hrefsBefore = await this.getCardsHref();
    await this.search(value, filter);
    await this.waitForCardsToUpdate(hrefsBefore);
  }

  async validateAutoLoadImagesOnScrollDown(checkLabel?: string[]) {
    await this.scroller.validateAutoLoadUntilLoadMore();
    await this.loadMoreBtn.scrollIntoViewIfNeeded();
    await this.loadMoreBtn.hover();
    if (checkLabel) await this.validateWallpapersToHaveLabels(checkLabel);
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

  exploreCategoryLink(category: string): Locator {
    return this.explore.link(category);
  }

  selectDifferentSubFilter() {
    return this.explore.selectDifferentSubFilter();
  }
}
