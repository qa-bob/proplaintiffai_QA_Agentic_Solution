/**
 * src/pages/contact.page.ts
 *
 * ContactFormPage provides methods for inspecting and interacting with
 * contact forms.  It explicitly does NOT submit forms to avoid sending
 * spam messages to real company inboxes.
 */

import { type Locator } from '@playwright/test';
import { BasePage } from '@pages/base.page';

export interface FormFieldInfo {
  name: string;
  type: string;
  required: boolean;
}

export class ContactFormPage extends BasePage {
  // ── Form discovery ───────────────────────────────────────────────────────────

  /**
   * Find the primary contact form on the current page.
   * Returns null if no form is found.
   *
   * Strategy (in priority order):
   *  1. <form> with action containing "contact"
   *  2. <form> containing an email input
   *  3. First <form> on the page
   */
  async findContactForm(): Promise<Locator | null> {
    // Strategy 1: form whose action URL hints "contact"
    const byAction = this.page.locator('form[action*="contact" i], form[action*="message" i]');
    if (await byAction.count() > 0) return byAction.first();

    // Strategy 2: form containing an email field
    const withEmail = this.page.locator('form').filter({
      has: this.page.locator('input[type="email"], input[name*="email" i]'),
    });
    if (await withEmail.count() > 0) return withEmail.first();

    // Strategy 3: any form at all
    const anyForm = this.page.locator('form').first();
    if (await anyForm.count() > 0) return anyForm;

    return null;
  }

  // ── Field inspection ─────────────────────────────────────────────────────────

  /**
   * Return metadata about each input/textarea/select inside the contact form.
   */
  async getFormFields(): Promise<FormFieldInfo[]> {
    const form = await this.findContactForm();
    if (!form) return [];

    const inputLocator = form.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
    const count = await inputLocator.count();
    const fields: FormFieldInfo[] = [];

    for (let i = 0; i < count; i++) {
      const el = inputLocator.nth(i);
      const name =
        (await el.getAttribute('name')) ??
        (await el.getAttribute('id')) ??
        (await el.getAttribute('placeholder')) ??
        `field-${i}`;
      const type = (await el.getAttribute('type')) ?? (await el.evaluate<string>((node) => node.tagName.toLowerCase()));
      const required =
        (await el.getAttribute('required')) !== null ||
        (await el.getAttribute('aria-required')) === 'true';

      fields.push({ name, type, required });
    }

    return fields;
  }

  // ── Field presence helpers ───────────────────────────────────────────────────

  /** Returns true if the form contains an email input field. */
  async hasEmailField(): Promise<boolean> {
    const form = await this.findContactForm();
    if (!form) return false;
    const emailField = form.locator(
      'input[type="email"], input[name*="email" i], input[placeholder*="email" i]'
    );
    return (await emailField.count()) > 0;
  }

  /** Returns true if the form contains a name input field. */
  async hasNameField(): Promise<boolean> {
    const form = await this.findContactForm();
    if (!form) return false;
    const nameField = form.locator(
      'input[name*="name" i], input[placeholder*="name" i], input[autocomplete*="name" i]'
    );
    return (await nameField.count()) > 0;
  }

  /** Returns true if the form has a submit button. */
  async hasSubmitButton(): Promise<boolean> {
    const form = await this.findContactForm();
    if (!form) return false;
    const submit = form.locator(
      'button[type="submit"], input[type="submit"], button:not([type="button"]):not([type="reset"])'
    ).filter({ hasText: /submit|send|contact|get in touch|reach out/i });

    // Also accept any <button> inside the form (many forms omit type="submit")
    if (await submit.count() > 0) return true;

    const anyButton = form.locator('button, input[type="submit"]');
    return (await anyButton.count()) > 0;
  }

  // ── Form filling (without submission) ────────────────────────────────────────

  /**
   * Fill form fields with the provided key→value map.
   * Keys are matched against field name, id, and placeholder attributes.
   * Does NOT click submit.
   */
  async fillForm(data: Record<string, string>): Promise<void> {
    const form = await this.findContactForm();
    if (!form) throw new Error('[ContactFormPage] No contact form found on this page.');

    for (const [key, value] of Object.entries(data)) {
      const field = form.locator(
        `input[name="${key}"], input[id="${key}"], input[placeholder*="${key}" i], ` +
        `textarea[name="${key}"], textarea[id="${key}"], textarea[placeholder*="${key}" i]`
      ).first();

      if (await field.count() > 0) {
        await field.fill(value);
      }
    }
  }

  // ── High-level validation ────────────────────────────────────────────────────

  /**
   * Returns true if a contact form is present and appears to be functional
   * (has at minimum an email field and a submit button).
   */
  async validateFormPresence(): Promise<boolean> {
    const form = await this.findContactForm();
    if (!form) return false;

    const hasEmail = await this.hasEmailField();
    const hasSubmit = await this.hasSubmitButton();

    return hasEmail && hasSubmit;
  }
}
