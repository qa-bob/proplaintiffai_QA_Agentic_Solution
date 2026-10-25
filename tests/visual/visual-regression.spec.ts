/**
 * tests/visual/visual-regression.spec.ts
 *
 * Visual regression tests — compare screenshots against stored baselines.
 * Run `npm run baseline` to capture new baselines after intentional design changes.
 *
 * Each test runs only in the Playwright project whose viewport it targets, and
 * is skipped (not failed) until a baseline has been captured for it.
 *
 * Tag: @visual
 */

import * as fs from 'fs';
import { test, expect } from '@fixtures/site.fixture';
import { dismissCookieBanner } from '@utils/visual-helper';

// Shared screenshot options applied to all visual tests
const SCREENSHOT_OPTIONS = {
  maxDiffPixels: 500,
  animations: 'disabled',
  caret: 'hide',
  fullPage: true,
} as const;

const VISUAL_CASES = [
  { label: 'desktop', project: 'chromium-desktop', snapshot: 'homepage-desktop.png' },
  { label: 'mobile', project: 'mobile-chrome', snapshot: 'homepage-mobile.png' },
  { label: 'tablet', project: 'tablet', snapshot: 'homepage-tablet.png' },
] as const;

test.describe('Visual Regression @visual', () => {
  // Skip entire suite when site config opts out
  test.beforeEach(async ({ siteConfig }) => {
    if (siteConfig.skipVisual) {
      test.skip(true, `Visual regression skipped for "${siteConfig.name}" (skipVisual: true)`);
    }
  });

  for (const { label, project, snapshot } of VISUAL_CASES) {
    test(`homepage visual regression - ${label} @visual`, async ({ page, siteConfig }, testInfo) => {
      test.skip(testInfo.project.name !== project, `Runs only in the "${project}" project`);

      // Only `--update-snapshots` (all/changed) should create a missing baseline
      const isUpdating = ['all', 'changed'].includes(testInfo.config.updateSnapshots);
      const baselinePath = testInfo.snapshotPath(snapshot, { kind: 'screenshot' });
      test.skip(
        !isUpdating && !fs.existsSync(baselinePath),
        `No baseline at ${baselinePath} — run "npm run baseline" to capture one`
      );

      await page.goto(siteConfig.url, { waitUntil: 'load' });

      // Dismiss any cookie/consent banners that would interfere with comparison
      await dismissCookieBanner(page);

      await expect(page).toHaveScreenshot(snapshot, { ...SCREENSHOT_OPTIONS });
    });
  }
});
