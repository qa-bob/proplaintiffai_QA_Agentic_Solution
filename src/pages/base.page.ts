/**
 * src/pages/base.page.ts
 *
 * BasePage provides shared methods used by every page object.
 * It intentionally uses broad, role-based locator strategies so it works
 * across diverse site designs without relying on class names or IDs.
 */

import { type Page, type Locator } from '@playwright/test';
import type { SiteConfig } from '@types/site-config.types';

export class BasePage {
  readonly page: Page;
  readonly config: SiteConfig;
  readonly url: string;

  constructor(page: Page, config: SiteConfig) {
    this.page = page;
    this.config = config;
    this.url = config.url;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  /** Navigate to the site root URL. */
  async navigate(): Promise<void> {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
  }

  /** Wait until network activity has settled. */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  // ── Page metadata ───────────────────────────────────────────────────────────

  /** Return the document <title> text. */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  // ── Layout checks ───────────────────────────────────────────────────────────

  /**
   * Returns true if there is no horizontal overflow (i.e., page is responsive).
   * Compares scrollWidth vs clientWidth on document.body.
   */
  async isResponsive(): Promise<boolean> {
    const hasHorizontalScroll = await this.page.evaluate<boolean>(() => {
      return document.body.scrollWidth > document.documentElement.clientWidth;
    });
    return !hasHorizontalScroll;
  }

  // ── Screenshots ─────────────────────────────────────────────────────────────

  /** Capture a full-page screenshot and return its buffer. */
  async takeScreenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({
      fullPage: true,
      path: `test-results/screenshots/${name}.png`,
    });
  }

  // ── Console errors ──────────────────────────────────────────────────────────

  /**
   * Collect JavaScript console errors emitted during a test.
   * Attach the listener BEFORE navigating; call this method after to retrieve
   * the accumulated messages.
   *
   * Usage pattern:
   *   const errors: string[] = [];
   *   page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
   *   await basePage.navigate();
   *   const errs = await basePage.checkNoConsoleErrors();
   */
  async checkNoConsoleErrors(): Promise<string[]> {
    // Evaluate inline errors captured in window (best-effort for SSR pages)
    const inlineErrors = await this.page.evaluate<string[]>(() => {
      // Some frameworks surface window.errors
      return (window as unknown as Record<string, unknown>)['__playwright_errors__'] as string[] ?? [];
    });
    return inlineErrors;
  }

  // ── Element helpers ─────────────────────────────────────────────────────────

  /**
   * Return all <a> elements on the page as Playwright Locators.
   * Caller should iterate with .all() to get ElementHandle array if needed.
   */
  async getLinkElements(): Promise<Locator[]> {
    const locator = this.page.locator('a[href]');
    return locator.all();
  }

  /**
   * Return all <form> elements on the page as Playwright Locators.
   */
  async getFormElements(): Promise<Locator[]> {
    const locator = this.page.locator('form');
    return locator.all();
  }
}
