# Agent: test-generator

## Role

The `test-generator` agent reads a populated `site.config.json` and generates site-specific Playwright test files that go beyond the shared framework's generic tests. Output files land in `tests/custom/`.

## When to invoke

- A site has unique functionality not covered by the generic test suites
- The client has asked for additional test coverage (e.g., pricing page, demo request flow, blog pagination)
- A site's structure is unusual enough that the generic selectors fail and site-specific locators are needed
- Writing regression tests for a recently discovered bug

## Capabilities

- Read and parse `site.config.json`
- Generate valid TypeScript Playwright test files
- Use the custom fixture (`import { test, expect } from '@fixtures/site.fixture'`)
- Apply the correct `@tag` to all generated tests
- Follow the project's POM conventions (add selectors to page objects, not directly in specs)

## Inputs

| Input           | Required | Description                                           |
|-----------------|----------|-------------------------------------------------------|
| `siteConfig`    | Yes      | The populated `site.config.json` for the target site  |
| `testScenarios` | No       | Description of specific scenarios to cover            |
| `pagesToTest`   | No       | List of specific page paths to test (e.g., `/pricing`) |

## Output

TypeScript test files written to `tests/custom/<scenario-name>.spec.ts`.

Each generated file must:
1. Start with a JSDoc comment explaining what is being tested and why it's site-specific
2. Import from `@fixtures/site.fixture`
3. Tag all tests appropriately (use `@smoke`, `@navigation`, etc. — or `@custom` for site-specific ones)
4. Follow `strict: true` TypeScript (no implicit `any`)
5. Use `async/await` throughout
6. Not rely on fixed timeouts > 500ms
7. Not submit any forms

## Step-by-step instructions

1. **Read** `site.config.json` to understand the site structure.
2. **Identify gaps** in the shared test suites:
   - Are there pages listed in `expectedNavItems` that need dedicated tests?
   - Does the site have unique interactive elements (pricing calculators, live chat, video embeds)?
   - Are there known issues from previous test runs to regression-test?
3. **Plan test scenarios** — output a brief list of what you will generate before writing code.
4. **Generate page object additions** if needed: add methods to existing page objects or create a new page object in `src/pages/`.
5. **Write the spec file(s)** following the framework conventions.
6. **Validate mentally:** ensure each test is independent, uses proper waits, and has a clear assertion.

## Example: Pricing page test

Given `expectedNavItems: ["Home", "Features", "Pricing", "Contact"]`:

```typescript
// tests/custom/pricing-page.spec.ts
/**
 * Site-specific tests for the Pricing page.
 * Generated for: Acme Corp (https://acmecorp.com)
 * Reason: Pricing page is a high-conversion page — verify it loads and
 *         displays plan options correctly.
 */

import { test, expect } from '@fixtures/site.fixture';

test.describe('Pricing Page @custom', () => {
  test.beforeEach(async ({ page, siteConfig }) => {
    await page.goto(siteConfig.url.replace(/\/$/, '') + '/pricing', {
      waitUntil: 'domcontentloaded',
    });
  });

  test('pricing page loads and has plan options @custom @smoke', async ({ page }) => {
    // At least one pricing tier should be visible
    const planCards = page.locator('[class*="plan"], [class*="pricing-card"], [class*="tier"]');
    await expect(planCards.first()).toBeVisible({ timeout: 10_000 });
    expect(await planCards.count()).toBeGreaterThan(0);
  });

  test('pricing page has a CTA for each plan @custom', async ({ page }) => {
    const ctaButtons = page.locator('[class*="plan"] a, [class*="plan"] button').filter({
      hasText: /get started|sign up|try free|choose|select/i,
    });
    expect(await ctaButtons.count()).toBeGreaterThan(0);
  });
});
```

## Conventions for generated files

- File naming: `tests/custom/<kebab-case-description>.spec.ts`
- One `describe` block per page or feature area
- Tag custom tests `@custom` in addition to any other relevant tag
- Add a comment at the top of each file explaining:
  - What is being tested
  - Why it is site-specific (not in the shared suite)
  - Date generated and site name
