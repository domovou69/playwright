import { expect, Locator, Page } from '@playwright/test';
import { AudioCards } from './AudioCards';
import { AudioPlayer } from './AudioPlayer';
import { AudioDownloadFlow } from './AudioDownloadFlow';

// /<area>/<GUID>, shared by ringtones and notification sounds: the keyword-chip href prefix and the cards class are the
// difference. Share/Download/Buy are rendered twice (mobile and desktop): role queries skip the hidden copy.
export abstract class AudioDetailPage {
  readonly player: AudioPlayer;
  readonly related: AudioCards;
  readonly downloadFlow: AudioDownloadFlow;

  readonly title: Locator;
  readonly artistLink: Locator;
  readonly downloads: Locator;
  readonly tagChips: Locator;
  readonly premiumBadge: Locator;
  readonly downloadBtn: Locator;
  readonly buyBtn: Locator;
  readonly relatedHeading: Locator;

  constructor(
    readonly page: Page,
    basePath: string,
    createCards: (grid: { cardsContainer: Locator; page: Page }) => AudioCards
  ) {
    const main = page.locator('main');
    this.title = main.getByRole('heading', { level: 1 });
    // A page-wide "500M+ Downloads" stat exists too: take the count that sits with the H1.
    this.downloads = this.title.locator('..').locator('p', { hasText: 'Downloads' });
    this.artistLink = main.locator('a[href^="/profiles/"]');
    this.tagChips = main.locator(`a[href^="${basePath}?keyword="]`);
    this.premiumBadge = main.getByText('Premium', { exact: true });
    this.downloadBtn = main.getByRole('button', { name: 'Download', exact: true });
    this.buyBtn = main.getByRole('button', { name: /^Buy for Ƶ/ });
    this.relatedHeading = main.getByRole('heading', { name: 'Related' });

    // The header block with the player is the first CardsContainer; Related is the one after its heading (not `.last()`, which
    // flipped to another container while Related was still rendering).
    this.player = new AudioPlayer(main.locator('div[class*="CardsContainer_cards-container-header"]'));
    this.related = createCards({
      cardsContainer: this.relatedHeading.locator('xpath=following::div[contains(@class, "CardsContainer")][1]'),
      page,
    });
    this.downloadFlow = new AudioDownloadFlow(page);
  }

  async validateFree(title: string) {
    await expect(this.title).toHaveText(title);
    await expect(this.artistLink).toBeVisible();
    await expect(this.downloads).toBeVisible();
    await expect(this.tagChips.first()).toBeVisible();
    await expect(this.premiumBadge).not.toBeAttached();
    await expect(this.buyBtn).toHaveCount(0);
    await expect(this.downloadBtn).toBeEnabled();
    await expect(this.player.button).toBeVisible();
  }

  async validatePremiumGate(price: string) {
    await expect(this.premiumBadge).toBeVisible();
    await expect(this.page.getByText(price, { exact: true }).last()).toBeVisible();
    await expect(this.buyBtn).toHaveText(`Buy for Ƶ${price}`);
    await expect(this.buyBtn).toBeEnabled();
    await expect(this.downloadBtn).toHaveCount(0);
  }

  async clickBuy() {
    await this.buyBtn.click();
  }

  // Returns the tag text, then follows the chip.
  async openFirstTag(): Promise<string> {
    const chip = this.tagChips.first();
    const tag = ((await chip.textContent()) ?? '').trim();
    await chip.click();
    return tag;
  }

  // Related renders only after a scroll: wheel inside the poll until its heading shows.
  async scrollToRelated() {
    await expect(this.relatedHeading).not.toBeAttached();
    const viewport = this.page.viewportSize();
    if (viewport) await this.page.mouse.move(viewport.width / 2, viewport.height / 2);
    await expect
      .poll(
        async () => {
          await this.page.mouse.wheel(0, 600);
          return this.relatedHeading.isVisible();
        },
        { timeout: 30_000, intervals: [300] }
      )
      .toBe(true);
  }

  // Every related card is a valid card and none is the item that is open.
  async validateRelated(openHref: string) {
    await this.related.validateFirst(24);
    expect(await this.related.all.evaluateAll(cards => cards.map(card => card.getAttribute('href')))).not.toContain(openHref);
  }
}
