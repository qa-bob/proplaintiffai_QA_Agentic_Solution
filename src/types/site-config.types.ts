/**
 * src/types/site-config.types.ts
 *
 * TypeScript interface for site.config.json and a loader function.
 * Every field that is optional in the JSON has a defined default so
 * consuming code can rely on the shape without null checks everywhere.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Auth sub-config ──────────────────────────────────────────────────────────

export interface SiteAuth {
  required: boolean;
  loginUrl: string;
  username: string;
  password: string;
}

// ── Root site config ─────────────────────────────────────────────────────────

export interface SiteConfig {
  /** Human-readable company name */
  name: string;
  /** Fully-qualified root URL of the site under test */
  url: string;
  /** Short description used in reports */
  description: string;
  /** Industry vertical (informational only) */
  industry: string;
  /** Whether the site has a contact form to test */
  hasContactForm: boolean;
  /** List of nav item labels expected to be present */
  expectedNavItems: string[];
  /** Viewport breakpoints to exercise */
  viewports: Array<'desktop' | 'mobile' | 'tablet'>;
  /** Skip visual regression tests for this site */
  skipVisual: boolean;
  /** Skip contact-form tests for this site */
  skipForms: boolean;
  /** Authentication settings */
  auth: SiteAuth;
}

// ── Default values ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: SiteConfig = {
  name: 'Unknown Company',
  url: 'https://example.com',
  description: '',
  industry: '',
  hasContactForm: false,
  expectedNavItems: [],
  viewports: ['desktop', 'mobile', 'tablet'],
  skipVisual: false,
  skipForms: false,
  auth: {
    required: false,
    loginUrl: '',
    username: '',
    password: '',
  },
};

// ── Loader ───────────────────────────────────────────────────────────────────

/**
 * Reads and validates site.config.json from the current working directory.
 * Falls back to DEFAULT_CONFIG values for any missing fields.
 * Throws if the file exists but contains invalid JSON.
 */
export function loadSiteConfig(configDir: string = process.cwd()): SiteConfig {
  const configPath = path.resolve(configDir, 'site.config.json');

  if (!fs.existsSync(configPath)) {
    console.warn(
      `[loadSiteConfig] site.config.json not found at ${configPath}. Using defaults.`
    );
    return { ...DEFAULT_CONFIG };
  }

  const raw = fs.readFileSync(configPath, 'utf-8');

  let parsed: Partial<SiteConfig>;
  try {
    parsed = JSON.parse(raw) as Partial<SiteConfig>;
  } catch (err) {
    throw new Error(`[loadSiteConfig] Invalid JSON in site.config.json: ${String(err)}`);
  }

  // Deep-merge with defaults so partial configs still work
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    auth: {
      ...DEFAULT_CONFIG.auth,
      ...(parsed.auth ?? {}),
    },
  };
}
