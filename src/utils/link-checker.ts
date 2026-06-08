/**
 * src/utils/link-checker.ts
 *
 * Utilities for checking links on a page: reachability, redirect detection,
 * and filtering to internal-only links.
 */

import { type Page } from '@playwright/test';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LinkResult {
  url: string;
  status: number;
  ok: boolean;
  redirected: boolean;
}

// ── Single link check ────────────────────────────────────────────────────────

/**
 * Check a single URL by issuing a HEAD request (falls back to GET on 405).
 *
 * @param url     - The URL to check (may be relative)
 * @param baseUrl - Base URL used to resolve relative links
 */
export async function checkLink(
  url: string,
  baseUrl: string,
  page: Page
): Promise<LinkResult> {
  // Resolve relative URLs
  let absoluteUrl: string;
  try {
    absoluteUrl = new URL(url, baseUrl).toString();
  } catch {
    return { url, status: 0, ok: false, redirected: false };
  }

  // Skip non-http(s) schemes (mailto:, tel:, javascript:, etc.)
  if (!absoluteUrl.startsWith('http://') && !absoluteUrl.startsWith('https://')) {
    return { url: absoluteUrl, status: 0, ok: true, redirected: false };
  }

  try {
    let response = await page.request.head(absoluteUrl, { timeout: 10_000 });

    // Some servers reject HEAD — retry with GET
    if (response.status() === 405) {
      response = await page.request.get(absoluteUrl, { timeout: 10_000 });
    }

    const finalUrl = response.url();
    return {
      url: absoluteUrl,
      status: response.status(),
      ok: response.ok(),
      redirected: finalUrl !== absoluteUrl,
    };
  } catch {
    return { url: absoluteUrl, status: 0, ok: false, redirected: false };
  }
}

// ── Batch link check ─────────────────────────────────────────────────────────

/**
 * Collect all <a href> elements on the current page and check each one.
 * Returns results for every unique href found.
 *
 * @param page    - Playwright Page instance
 * @param baseUrl - Base URL to resolve relative links
 */
export async function checkAllLinks(
  page: Page,
  baseUrl: string
): Promise<LinkResult[]> {
  // Gather all hrefs from the DOM
  const hrefs = await page.evaluate<string[]>(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return anchors.map((a) => (a as HTMLAnchorElement).href).filter(Boolean);
  });

  // Deduplicate
  const unique = Array.from(new Set(hrefs));

  // Check each link sequentially to avoid hammering the target server
  const results: LinkResult[] = [];
  for (const href of unique) {
    const result = await checkLink(href, baseUrl, page);
    results.push(result);
  }

  return results;
}

// ── Filter helpers ───────────────────────────────────────────────────────────

/**
 * Filter a list of LinkResult objects to only those whose URL is within the
 * same origin as baseUrl.
 */
export function filterInternalLinks(
  links: LinkResult[],
  baseUrl: string
): LinkResult[] {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return links;
  }

  return links.filter((link) => {
    try {
      return new URL(link.url).origin === origin;
    } catch {
      return false;
    }
  });
}
