/**
 * global-setup.ts
 *
 * Runs once before the entire Playwright test suite.
 * Verifies the target site is reachable.  If unreachable it logs a warning
 * but does NOT fail so that CI pipelines still collect whatever results
 * they can from a flaky or temporarily unavailable site.
 */

import * as fs from 'fs';
import * as path from 'path';

interface SiteConfig {
  name?: string;
  url?: string;
}

async function globalSetup(): Promise<void> {
  const configPath = path.resolve(process.cwd(), 'site.config.json');

  let config: SiteConfig = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw) as SiteConfig;
  } catch {
    console.warn('[global-setup] Warning: Could not read site.config.json.');
  }

  const siteUrl = process.env.SITE_URL ?? config.url ?? 'https://example.com';
  const siteName = config.name ?? siteUrl;

  console.log(`\n[global-setup] Checking reachability of "${siteName}" → ${siteUrl}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(siteUrl, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status < 500) {
      console.log(`[global-setup] Site reachable — HTTP ${response.status} (${siteName})`);
    } else {
      console.warn(
        `[global-setup] Warning: Site returned HTTP ${response.status} for "${siteName}". Tests may fail.`
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[global-setup] Warning: Could not reach "${siteName}" (${siteUrl}). ` +
        `Error: ${message}. Proceeding with tests anyway.`
    );
  }
}

export default globalSetup;
