/**
 * src/utils/visual-helper.ts
 *
 * Helpers for visual regression testing: baseline capture and comparison.
 * Wraps Playwright's built-in screenshot comparison with sensible defaults.
 */

import * as fs from 'fs';
import * as path from 'path';
import { type Page, expect } from '@playwright/test';

// ── Viewport size constants ──────────────────────────────────────────────────

export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

// ── Default comparison options ───────────────────────────────────────────────

export const DEFAULT_SNAPSHOT_OPTIONS = {
  maxDiffPixels: 500,
  animations: 'disabled',
  caret: 'hide',
} as const;

// ── Baseline capture ─────────────────────────────────────────────────────────

/**
 * Capture a baseline screenshot and save it to snapshotDir.
 * This is used when running `npm run baseline` to establish ground-truth images.
 *
 * @param page        - Playwright Page instance
 * @param name        - Logical name for this screenshot (used as filename)
 * @param snapshotDir - Absolute path to the snapshots directory
 */
export async function captureBaseline(
  page: Page,
  name: string,
  snapshotDir: string
): Promise<void> {
  await fs.promises.mkdir(snapshotDir, { recursive: true });

  const filePath = path.join(snapshotDir, `${name}.png`);
  await page.screenshot({
    path: filePath,
    fullPage: true,
    animations: 'disabled',
  });

  console.log(`[visual-helper] Baseline captured: ${filePath}`);
}

// ── Comparison ───────────────────────────────────────────────────────────────

/**
 * Compare the current page state against a previously captured baseline.
 * Uses Playwright's toHaveScreenshot() under the hood.
 *
 * @param page      - Playwright Page instance
 * @param name      - Name used to locate the baseline file
 * @param threshold - Maximum number of differing pixels (default: 500)
 * @returns true if comparison passes (within threshold)
 */
export async function compareWithBaseline(
  page: Page,
  name: string,
  threshold: number = DEFAULT_SNAPSHOT_OPTIONS.maxDiffPixels
): Promise<boolean> {
  try {
    await expect(page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: threshold,
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Viewport helper ──────────────────────────────────────────────────────────

/**
 * Set the page viewport to one of the named breakpoints.
 */
export async function setViewport(page: Page, viewport: ViewportName): Promise<void> {
  await page.setViewportSize(VIEWPORTS[viewport]);
}

// ── Cookie/banner dismissal ──────────────────────────────────────────────────

/**
 * Attempt to dismiss common cookie consent banners before capturing screenshots.
 * No-op if no banner is found.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const selectors = [
    'button[id*="cookie" i]',
    'button[class*="cookie" i]',
    'button[aria-label*="accept" i]',
    'button[aria-label*="agree" i]',
    '[data-testid*="cookie-accept"]',
    'button:has-text("Accept")',
    'button:has-text("Accept All")',
    'button:has-text("I Agree")',
    'button:has-text("Got it")',
  ];

  for (const selector of selectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1_000 })) {
        await btn.click();
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      // Not found — try next selector
    }
  }
}
