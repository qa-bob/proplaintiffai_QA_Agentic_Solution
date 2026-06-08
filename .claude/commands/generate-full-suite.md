# Generate Full Playwright Test Suite

You are a QA automation engineer. Your job is to analyze the website defined in `site.config.json` and build a **complete, production-quality Playwright + TypeScript regression test suite** using the Page Object Model (POM).

This suite must cover GUI, functional, and regression scenarios. It must work against the live website without requiring login unless `auth.required` is true in the config.

---

## Step 0: Read Configuration

Read `site.config.json`. Extract:
- `url` — the base URL to test
- `name` — the company/product name
- `hasContactForm` — whether to generate form tests
- `skipForms` / `skipVisual` — whether to skip those test categories
- `expectedNavItems` — expected navigation links (may be empty)

---

## Step 1: Site Discovery

Use `WebFetch` to analyze the site. Start with the homepage (`url`), then follow key links.

For each page you visit, record:
1. **Page title** and `<h1>` text
2. **Navigation links** — all `<a>` tags in `<nav>`, `<header>`, and the footer
3. **Forms** — all `<form>` elements, their `action`, method, and field names/types/placeholders
4. **Key interactive elements** — buttons, dropdowns, accordions, tabs, modals, carousels
5. **Unique content sections** — hero sections, feature grids, pricing tables, testimonials, CTAs
6. **Images and media** — any `<img>` or `<video>` elements that are key to the page

Visit at minimum: homepage, any "About", "Services", "Pricing", "Contact", "Features", "How It Works" pages you discover in the navigation.

---

## Step 2: Plan the Page Object Classes

Based on your discovery, plan one TypeScript class per distinct page/section. At minimum create:

- `src/pages/home.page.ts` — always required
- `src/pages/navigation.page.ts` — always required (update existing if present)
- `src/pages/contact.page.ts` — if `hasContactForm` is true (update existing if present)
- One class per additional discovered page (about, services, pricing, features, etc.)

Each page class must:
- `import { Page, Locator } from '@playwright/test'`
- Extend `BasePage` from `./base.page`
- Declare all key elements as `readonly Locator` properties
- Expose methods that represent **user actions** (e.g., `clickPrimaryNav(item)`, `fillContactForm(data)`, `openMobileMenu()`)
- Never put `expect()` assertions inside page objects — that belongs in tests

Example structure:
```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ServicesPage extends BasePage {
  readonly heroHeading: Locator;
  readonly serviceCards: Locator;
  readonly ctaButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heroHeading = page.locator('h1');
    this.serviceCards = page.locator('[class*="service-card"], [class*="service-item"]');
    this.ctaButton = page.locator('a[href*="contact"], button:has-text("Get Started")').first();
  }

  async clickCta(): Promise<void> {
    await this.ctaButton.click();
    await this.waitForLoad();
  }
}
```

---

## Step 3: Write the Page Object Files

Write each page object class to `src/pages/<name>.page.ts`. Use real selectors you discovered in Step 1 — not generic placeholders. If you could not determine a selector with confidence, use a resilient fallback like `page.locator('role=...')` or `page.getByText(...)`.

Update `src/fixtures/site.fixture.ts` to include any new page objects as fixture properties.

---

## Step 4: Write the Test Files

Write comprehensive tests across all categories. Each test file goes in the correct folder and uses the `@tag` system.

### `tests/smoke/site-availability.spec.ts` — @smoke
- Site loads with HTTP 200
- Page title is not empty
- No console errors on load
- Core content is visible (h1, nav, footer)
- Page loads in under 5 seconds

### `tests/navigation/nav-links.spec.ts` — @navigation
- All navigation links are present
- Each nav link navigates to the correct page (check URL or heading)
- Footer links are present and not broken
- Mobile menu opens and closes correctly
- Breadcrumbs (if present) are correct
- Back navigation works

### `tests/forms/contact-form.spec.ts` — @forms (if hasContactForm)
- Form renders with expected fields
- Required field validation triggers on empty submit
- Email field validates format
- Phone field (if present) validates format
- Each field accepts valid input
- Character limits on textarea (if present)
- Form is accessible (labels associated with inputs)
- Do NOT actually submit the form

### `tests/functional/` — @functional
Write tests for the actual business functionality you discovered. Examples:
- Pricing page: all plans visible, CTA buttons present, feature lists populated
- Features page: all feature sections load, images present, descriptions non-empty
- Services page: service cards all render, links work
- Search (if present): returns results, handles no-results state
- Video (if present): player renders and is playable
- Accordion/FAQ: items expand and collapse
- Carousel/slider: advances to next slide

Create one spec file per functional area (e.g., `tests/functional/pricing.spec.ts`, `tests/functional/features.spec.ts`).

### `tests/visual/visual-regression.spec.ts` — @visual
- Homepage desktop baseline
- Homepage mobile baseline
- Any key landing page baselines

### `tests/responsive/layout.spec.ts` — @responsive
- Navigation collapses to hamburger on mobile
- Content is not clipped or overflowing on 390px viewport
- Images scale correctly
- Text remains readable (font-size check)
- Horizontal scroll does not appear

---

## Step 5: Update site.config.json

Fill in any fields you discovered:
- `description` — one-sentence description of the product
- `industry` — the industry/category
- `expectedNavItems` — array of nav item labels you confirmed exist
- `hasContactForm` — set accurately based on what you found

---

## Step 6: Verify

Run a quick syntax check:
```bash
npx tsc --noEmit
```

Fix any TypeScript errors before finishing.

Report a summary of what you built:
- Pages analyzed
- Page object classes created
- Test files created
- Total test count
- Any pages or features you could not access (blocked, login-required, etc.)
