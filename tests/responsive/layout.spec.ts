/**
 * tests/responsive/layout.spec.ts
 *
 * Responsive layout tests — verify the site renders correctly across
 * viewport breakpoints and meets basic accessibility requirements.
 *
 * Tag: @responsive
 */

import { test, expect } from '@fixtures/site.fixture';

test.describe('Responsive Layout @responsive', () => {
  // ── Horizontal scroll ───────────────────────────────────────────────────────

  test('no horizontal scrollbar at mobile viewport @responsive', async ({ page, siteConfig }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate<boolean>(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(
      hasHorizontalScroll,
      'Page should not have a horizontal scrollbar at 390px (mobile viewport). ' +
        'Check for elements with fixed widths or overflow:auto/scroll.'
    ).toBeFalsy();
  });

  test('no horizontal scrollbar at tablet viewport @responsive', async ({ page, siteConfig }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate<boolean>(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(
      hasHorizontalScroll,
      'Page should not have a horizontal scrollbar at 768px (tablet viewport).'
    ).toBeFalsy();
  });

  // ── Text readability ─────────────────────────────────────────────────────────

  test('text is readable (font-size >= 12px) on mobile @responsive', async ({ page, siteConfig }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded' });

    // Find all visible text-bearing elements and check computed font-size
    const tinyTextCount = await page.evaluate<number>(() => {
      const MIN_FONT_SIZE = 12; // px
      const textElements = Array.from(
        document.querySelectorAll('p, span, a, li, td, th, label, button, h1, h2, h3, h4, h5, h6')
      );

      return textElements.filter((el) => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const isVisible = el.getBoundingClientRect().height > 0;
        return isVisible && fontSize < MIN_FONT_SIZE;
      }).length;
    });

    expect(
      tinyTextCount,
      `Found ${tinyTextCount} element(s) with font-size below 12px at mobile viewport. ` +
        'Small text hurts readability on mobile devices.'
    ).toBe(0);
  });

  // ── Image alt attributes ─────────────────────────────────────────────────────

  test('images have alt attributes @responsive', async ({ page, siteConfig }) => {
    await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded' });

    const missingAlt = await page.evaluate<string[]>(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .filter((img) => {
          // alt="" is valid for decorative images; missing alt attribute is the issue
          return !img.hasAttribute('alt');
        })
        .map((img) => img.src || img.getAttribute('data-src') || '[no src]');
    });

    if (missingAlt.length > 0) {
      console.warn(
        `[responsive] ${missingAlt.length} image(s) missing alt attribute:\n` +
          missingAlt.slice(0, 10).map((src) => `  ${src}`).join('\n') +
          (missingAlt.length > 10 ? `\n  ... and ${missingAlt.length - 10} more` : '')
      );
    }

    expect(
      missingAlt.length,
      `${missingAlt.length} <img> element(s) are missing the alt attribute (accessibility violation)`
    ).toBe(0);
  });

  // ── Viewport meta tag ────────────────────────────────────────────────────────

  test('page has proper meta viewport tag @responsive', async ({ page, siteConfig }) => {
    await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded' });

    const viewportContent = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');

    expect(
      viewportContent,
      'Page should have a <meta name="viewport"> tag. ' +
        'Without it, mobile browsers render the page at desktop width.'
    ).not.toBeNull();

    expect(
      viewportContent,
      'Viewport meta content should include "width=device-width"'
    ).toContain('width=device-width');
  });
});
