/**
 * tests/forms/contact-form.spec.ts
 *
 * Contact form tests — verify the presence and structure of contact forms.
 * IMPORTANT: These tests do NOT submit forms to avoid sending spam.
 *
 * Tag: @forms
 */

import { test, expect } from '@fixtures/site.fixture';

test.describe('Contact Form @forms', () => {
  // Skip the entire suite when skipForms is configured for this site
  test.beforeEach(async ({ siteConfig }) => {
    if (siteConfig.skipForms) {
      test.skip(true, `Forms testing skipped for "${siteConfig.name}" (skipForms: true)`);
    }
  });

  // ── Form presence ───────────────────────────────────────────────────────────

  test('contact form is present on site @forms', async ({ contactPage, siteConfig, page }) => {
    // Check homepage first
    await contactPage.navigate();
    let form = await contactPage.findContactForm();

    if (!form) {
      // Try /contact, /contact-us, /get-in-touch
      const contactPaths = ['/contact', '/contact-us', '/get-in-touch', '/reach-out'];
      for (const contactPath of contactPaths) {
        try {
          await page.goto(siteConfig.url.replace(/\/$/, '') + contactPath, {
            waitUntil: 'domcontentloaded',
            timeout: 10_000,
          });
          form = await contactPage.findContactForm();
          if (form) break;
        } catch {
          // Path doesn't exist — try next
        }
      }
    }

    if (!form) {
      // Also check if there's a "Contact" link in nav to follow
      const contactLink = page.locator('a').filter({ hasText: /contact/i }).first();
      if (await contactLink.count() > 0) {
        await contactLink.click();
        await page.waitForLoadState('domcontentloaded');
        form = await contactPage.findContactForm();
      }
    }

    expect(
      form,
      `No contact form found on "${siteConfig.name}". ` +
        'Checked homepage, /contact, /contact-us, /get-in-touch, and nav Contact link.'
    ).not.toBeNull();
  });

  // ── Required fields ─────────────────────────────────────────────────────────

  test('contact form has required fields (name, email) @forms', async ({ contactPage, siteConfig, page }) => {
    // Navigate to find the form
    await contactPage.navigate();
    let form = await contactPage.findContactForm();

    if (!form) {
      await page.goto(siteConfig.url.replace(/\/$/, '') + '/contact', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      }).catch(() => null);
      form = await contactPage.findContactForm();
    }

    if (!form) {
      test.skip(true, 'No contact form found — covered by "contact form is present" test');
      return;
    }

    const hasEmail = await contactPage.hasEmailField();
    const hasName = await contactPage.hasNameField();

    expect(hasEmail, 'Contact form should have an email input field').toBeTruthy();

    if (!hasName) {
      console.warn(
        `[forms] "${siteConfig.name}" contact form is missing a name field. ` +
          'This is a usability concern.'
      );
    }
  });

  // ── Submit button ───────────────────────────────────────────────────────────

  test('contact form has a submit button @forms', async ({ contactPage, siteConfig, page }) => {
    await contactPage.navigate();
    let form = await contactPage.findContactForm();

    if (!form) {
      await page.goto(siteConfig.url.replace(/\/$/, '') + '/contact', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      }).catch(() => null);
      form = await contactPage.findContactForm();
    }

    if (!form) {
      test.skip(true, 'No contact form found');
      return;
    }

    const hasSubmit = await contactPage.hasSubmitButton();
    expect(hasSubmit, 'Contact form should have a visible submit button').toBeTruthy();
  });

  // ── Labels and placeholders ─────────────────────────────────────────────────

  test('form fields have proper labels or placeholders @forms', async ({ contactPage, siteConfig, page }) => {
    await contactPage.navigate();
    let form = await contactPage.findContactForm();

    if (!form) {
      await page.goto(siteConfig.url.replace(/\/$/, '') + '/contact', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      }).catch(() => null);
      form = await contactPage.findContactForm();
    }

    if (!form) {
      test.skip(true, 'No contact form found');
      return;
    }

    const fields = await contactPage.getFormFields();
    const unlabeledFields: string[] = [];

    for (const field of fields) {
      if (field.type === 'hidden' || field.type === 'submit') continue;

      // Check for associated <label>, aria-label, or placeholder
      const fieldLocator = form.locator(
        `input[name="${field.name}"], textarea[name="${field.name}"]`
      ).first();

      if (await fieldLocator.count() === 0) continue;

      const hasAriaLabel = await fieldLocator.getAttribute('aria-label');
      const hasPlaceholder = await fieldLocator.getAttribute('placeholder');
      const fieldId = await fieldLocator.getAttribute('id');
      const hasLabel = fieldId
        ? (await page.locator(`label[for="${fieldId}"]`).count()) > 0
        : false;

      if (!hasAriaLabel && !hasPlaceholder && !hasLabel) {
        unlabeledFields.push(field.name);
      }
    }

    if (unlabeledFields.length > 0) {
      console.warn(
        `[forms] Fields without labels/placeholders in "${siteConfig.name}": ` +
          unlabeledFields.join(', ')
      );
    }

    // Soft assertion — warn but do not fail (label presence is accessibility best practice)
    expect(
      unlabeledFields.length,
      `${unlabeledFields.length} form field(s) have no label, aria-label, or placeholder`
    ).toBeLessThanOrEqual(fields.length / 2); // Allow max 50% unlabeled
  });

  // ── HTML5 validation ─────────────────────────────────────────────────────────

  test('required fields show validation when submitted empty @forms', async ({
    contactPage,
    siteConfig,
    page,
  }) => {
    await contactPage.navigate();
    let form = await contactPage.findContactForm();

    if (!form) {
      await page.goto(siteConfig.url.replace(/\/$/, '') + '/contact', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      }).catch(() => null);
      form = await contactPage.findContactForm();
    }

    if (!form) {
      test.skip(true, 'No contact form found');
      return;
    }

    const hasSubmit = await contactPage.hasSubmitButton();
    if (!hasSubmit) {
      test.skip(true, 'No submit button found in form');
      return;
    }

    // Click submit without filling any fields
    const submitBtn = form
      .locator('button[type="submit"], input[type="submit"], button:not([type="button"]):not([type="reset"])')
      .first();

    // Intercept any navigation that would result from form submission
    let navigationTriggered = false;
    page.on('request', (req) => {
      if (req.resourceType() === 'document' && req.method() === 'POST') {
        navigationTriggered = true;
      }
    });

    await submitBtn.click({ force: true });

    // Wait briefly to allow validation messages to appear
    await page.waitForTimeout(500);

    // Check that we're still on the same page (form was NOT submitted)
    expect(
      navigationTriggered,
      'Clicking submit on an empty form should NOT navigate away (validation should prevent submission)'
    ).toBeFalsy();

    // Check for HTML5 validation API on required fields
    const firstRequired = form.locator('[required]').first();
    if (await firstRequired.count() > 0) {
      const isValid = await firstRequired.evaluate<boolean>((el) => {
        return (el as HTMLInputElement).validity?.valid ?? true;
      });
      expect(
        isValid,
        'Required fields should be invalid when empty (browser validation)'
      ).toBeFalsy();
    }
  });
});
