import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Load site config from project root
function loadSiteUrl(): string {
  const configPath = path.resolve(process.cwd(), 'site.config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw) as { url?: string };
    return config.url ?? 'https://example.com';
  } catch {
    console.warn('[playwright.config] Could not read site.config.json — falling back to https://example.com');
    return 'https://example.com';
  }
}

const baseURL = process.env.SITE_URL ?? loadSiteUrl();
const isCI = Boolean(process.env.CI);

export default defineConfig({
  // ── Test discovery ──────────────────────────────────────────────
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  // ── Global settings ─────────────────────────────────────────────
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,

  // ── Global setup (reachability check) ───────────────────────────
  globalSetup: './global-setup.ts',

  // ── Reporters ───────────────────────────────────────────────────
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // ── Shared test options ─────────────────────────────────────────
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // ── Visual regression snapshots ─────────────────────────────────
  snapshotDir: '__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}-{projectName}{ext}',

  // ── Output directory ────────────────────────────────────────────
  outputDir: 'test-results',

  // ── Browser projects ────────────────────────────────────────────
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        channel: 'chromium',
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
