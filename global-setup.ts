/**
 * global-setup.ts
 *
 * Runs once before the entire Playwright test suite.
 * Verifies the target site is reachable.  If the site cannot be reached at
 * all (DNS, TLS or connection failure) the run stops here with one clear
 * error instead of every test timing out.  Set ALLOW_UNREACHABLE=1 to
 * proceed anyway.  HTTP 5xx responses only log a warning.
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
    const raw = fs.readFileSync(configPath, 'utf-8').replace(/^\uFEFF/, '');
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
    if (process.env.ALLOW_UNREACHABLE === '1') {
      console.warn(
        `[global-setup] Warning: Could not reach "${siteName}" (${siteUrl}). ` +
          `Error: ${message}. Proceeding because ALLOW_UNREACHABLE=1.`
      );
      return;
    }
    throw new Error(
      `[global-setup] Site unreachable: "${siteName}" (${siteUrl}). Error: ${message}. ` +
        'Set ALLOW_UNREACHABLE=1 to run the suite anyway.'
    );
  }
}

export default globalSetup;
