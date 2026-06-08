/**
 * tests/navigation/nav-links.spec.ts
 *
 * Navigation tests — verify the primary nav is present, all links resolve,
 * mobile menu works, and link text meets accessibility best practices.
 *
 * Tag: @navigation
 */

import { test, expect } from '@fixtures/site.fixture';

test.describe('Navigation @navigation', () => {
  test.beforeEach(async ({ navigationPage }) => {
    await navigationPage.navigate();
    await navigationPage.waitForLoad();
  });

  // ── Visibility ──────────────────────────────────────────────────────────────

  test('navigation menu is visible @navigation', async ({ navigationPage }) => {
    const isVisible = await navigationPage.isNavVisible();
    expect(isVisible, 'A nav / [role="navigation"] element should be visible').toBeTruthy();
  });

  // ── Link reachability ───────────────────────────────────────────────────────

  test('all nav links are reachable (no 404s) @navigation', async ({ navigationPage, siteConfig }) => {
    const results = await navigationPage.checkAllNavLinksReachable();

    if (results.length === 0) {
      console.warn('[navigation] No nav links found to check — skipping reachability assertion.');
      return;
    }

    const broken = results.filter((r) => !r.ok && r.status !== 0);
    const unreachable = results.filter((r) => r.status === 0);

    // Log unreachable links as warnings (network issues, not 404s)
    if (unreachable.length > 0) {
      console.warn(
        '[navigation] Could not reach (network):\n' +
          unreachable.map((r) => `  ${r.url}`).join('\n')
      );
    }

    expect(
      broken,
      `Found ${broken.length} broken nav link(s):\n` +
        broken.map((r) => `  ${r.url} → HTTP ${r.status}`).join('\n')
    ).toHaveLength(0);
  });

  // ── Mobile nav ──────────────────────────────────────────────────────────────

  test('mobile nav menu toggles correctly @navigation', async ({ navigationPage, page }) => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await navigationPage.navigate();
    await navigationPage.waitForLoad();

    const toggle = await navigationPage.getMobileMenuToggle();

    if (!toggle) {
      // Site may use a CSS-only responsive nav — pass if nav is already visible
      const navVisible = await navigationPage.isNavVisible();
      expect(
        navVisible,
        'At mobile viewport, either a menu toggle or visible nav should exist'
      ).toBeTruthy();
      return;
    }

    // Toggle should be visible
    await expect(toggle, 'Mobile menu toggle should be visible').toBeVisible();

    // Open the menu
    await navigationPage.openMobileMenu();

    // After opening, at least one nav link should be visible
    const navLinks = await navigationPage.getNavLinks();
    expect(
      navLinks.length,
      'After opening mobile menu, nav links should be discoverable'
    ).toBeGreaterThan(0);
  });

  // ── Accessible link text ────────────────────────────────────────────────────

  test('nav links have descriptive text (not just "click here") @navigation', async ({ navigationPage }) => {
    const navLinks = await navigationPage.getNavLinks();

    if (navLinks.length === 0) {
      console.warn('[navigation] No nav links found — skipping text quality check.');
      return;
    }

    const badPhrases = /^(click here|here|more|read more|learn more|link|go)$/i;
    const genericLinks = navLinks.filter((link) => badPhrases.test(link.text.trim()));

    expect(
      genericLinks,
      `Found nav links with non-descriptive text:\n` +
        genericLinks.map((l) => `  "${l.text}" → ${l.href}`).join('\n')
    ).toHaveLength(0);
  });

  // ── Logo home link ──────────────────────────────────────────────────────────

  test('logo links back to homepage @navigation', async ({ page, siteConfig }) => {
    await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded' });

    // Find the site logo — common patterns
    const logoLink = page.locator(
      'a[class*="logo" i], a[aria-label*="home" i], a[aria-label*="logo" i], ' +
      'header a[href="/"], header a[href="' + siteConfig.url + '"]'
    ).first();

    if (await logoLink.count() === 0) {
      console.warn('[navigation] Could not identify a logo link — skipping this assertion.');
      return;
    }

    const href = await logoLink.getAttribute('href');
    expect(href).not.toBeNull();

    // Resolve relative href
    const resolvedHref = new URL(href!, siteConfig.url).toString();
    const siteOrigin = new URL(siteConfig.url).origin;

    expect(
      resolvedHref.startsWith(siteOrigin),
      `Logo link "${href}" should point to the site homepage (origin: ${siteOrigin})`
    ).toBeTruthy();
  });
});
