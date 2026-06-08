# /analyze-site

Analyze a live website and produce a fully-populated `site.config.json`.

## Usage

```
/analyze-site [url]
```

If `url` is omitted, read `site.config.json` in the current directory and use its `url` field.

## What this command does

1. **Navigate to the site** using the provided URL (or the URL from `site.config.json`).
2. **Inspect the page structure:**
   - Page `<title>` and `<meta name="description">` content
   - Primary navigation: extract all nav link text and hrefs
   - Presence of `<form>` elements (especially those with email fields)
   - H1 / main heading text
   - Primary CTA button text and targets
   - Meta viewport tag presence
   - Whether the site loads over HTTPS
   - Favicon presence
3. **Attempt to find the contact page:** try `/contact`, `/contact-us`, `/get-in-touch` and check for forms there too.
4. **Assess responsiveness:** check for horizontal overflow at 390px viewport.
5. **Output a completed `site.config.json`** with all discovered values filled in — ready to paste into the repo.
6. **Report any issues found**, such as:
   - Missing meta description
   - No contact form found
   - Missing meta viewport tag
   - HTTP instead of HTTPS
   - Nav links returning 404
   - No alt text on hero images
   - No `<h1>` on homepage

## Output format

Produce a JSON block followed by an issues list:

```json
{
  "name": "<discovered company name>",
  "url": "<url>",
  "description": "<meta description>",
  "industry": "<inferred from content>",
  "hasContactForm": true,
  "expectedNavItems": ["Home", "About", "Services", "Contact"],
  "viewports": ["desktop", "mobile", "tablet"],
  "skipVisual": false,
  "skipForms": false,
  "auth": {
    "required": false,
    "loginUrl": "",
    "username": "",
    "password": ""
  }
}
```

### Issues found
- [ ] Missing meta description
- [ ] Contact form has no name field
- (etc.)

## Handling edge cases

- **SPAs (React/Vue/Angular):** Wait for `networkidle` before scraping. If the DOM appears empty, wait an additional 2 seconds and retry.
- **Auth-gated content:** If the page redirects to a login URL, set `auth.required: true` and `auth.loginUrl` to the redirect target. Set `skipForms: true` and `skipVisual: true` for gated sites unless credentials are provided.
- **Redirect chains:** Follow redirects and use the final URL as the canonical `url` value.
- **Cookie consent banners:** Dismiss before inspecting nav and form structure.
- **Lazy-loaded nav (hamburger only at all sizes):** Open any mobile toggle before extracting nav links.
