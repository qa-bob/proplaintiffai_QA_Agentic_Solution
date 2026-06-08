/**
 * src/pages/home.page.ts
 *
 * HomePage models the site's root/homepage.
 * Uses semantic and role-based selectors to stay design-agnostic.
 */

import { type Locator } from '@playwright/test';
import { BasePage } from '@pages/base.page';

export class HomePage extends BasePage {
  // ── Hero / above-the-fold ───────────────────────────────────────────────────

  /**
   * Return the text content of the hero section.
   * Tries common hero patterns: <section> with role="banner", first <h1>,
   * or elements with data-testid="hero".
   */
  async getHeroText(): Promise<string> {
    // Ordered preference: banner landmark → data-testid → first section
    const candidates = [
      this.page.getByRole('banner').first(),
      this.page.locator('[data-testid="hero"]').first(),
      this.page.locator('section').first(),
      this.page.locator('header').first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.count() > 0) {
        const text = await candidate.textContent();
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    }

    return '';
  }

  // ── CTAs ────────────────────────────────────────────────────────────────────

  /**
   * Return all primary call-to-action buttons/links visible on the page.
   * Looks for <button> and <a> elements styled as buttons, or those
   * whose text contains common CTA phrases.
   */
  async getCTAButtons(): Promise<Locator[]> {
    const ctaLocator = this.page.locator(
      'a[class*="btn"], a[class*="button"], a[class*="cta"], ' +
      'button[class*="primary"], button[class*="cta"], ' +
      '[role="button"]'
    );

    const all = await ctaLocator.all();

    // If CSS class approach yields nothing, fall back to text-match heuristics
    if (all.length === 0) {
      const textCta = this.page.locator(
        'a, button'
      ).filter({
        hasText: /get started|try free|sign up|contact us|learn more|request demo/i,
      });
      return textCta.all();
    }

    return all;
  }

  // ── Headings ────────────────────────────────────────────────────────────────

  /**
   * Return the text of the first <h1> on the page.
   * Falls back to first <h2> if no <h1> exists (some SPAs render h2 first).
   */
  async getMainHeading(): Promise<string> {
    const h1 = this.page.locator('h1').first();
    if (await h1.count() > 0) {
      return (await h1.textContent())?.trim() ?? '';
    }

    const h2 = this.page.locator('h2').first();
    if (await h2.count() > 0) {
      return (await h2.textContent())?.trim() ?? '';
    }

    return '';
  }

  // ── Load verification ───────────────────────────────────────────────────────

  /**
   * Returns true when key homepage elements are present:
   *  - A heading exists
   *  - At least one nav element exists
   *  - Body has some text content
   */
  async isLoaded(): Promise<boolean> {
    try {
      // Heading present
      const headingCount = await this.page.locator('h1, h2').count();
      if (headingCount === 0) return false;

      // Navigation present
      const navCount = await this.page.locator('nav, [role="navigation"]').count();
      if (navCount === 0) return false;

      // Page has meaningful text
      const bodyText = await this.page.evaluate<string>(() => document.body.innerText);
      if (bodyText.trim().length < 50) return false;

      return true;
    } catch {
      return false;
    }
  }
}
