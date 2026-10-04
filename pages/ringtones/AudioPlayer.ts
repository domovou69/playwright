import { expect, Locator } from '@playwright/test';

// The play control of a list card or of the detail page. There is no <audio> element and the button name never changes,
// so the only observable state is `data-playing` and the growing width of the progress bar.
export class AudioPlayer {
  readonly button: Locator;
  readonly progress: Locator;

  constructor(scope: Locator) {
    this.button = scope.locator('button[title="Play audio"]');
    this.progress = scope.locator('[class*="card-audio-progress"]');
  }

  async toggle() {
    await this.button.click();
  }

  async validatePlaying(playing: boolean) {
    await expect(this.progress).toHaveAttribute('data-playing', String(playing));
  }

  async validateProgressGrows() {
    await expect.poll(() => this.progress.evaluate(bar => parseFloat((bar as HTMLElement).style.width))).toBeGreaterThan(0);
  }
}
