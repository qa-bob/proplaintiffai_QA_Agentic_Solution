# /run-smoke

Run the smoke test suite and display a clean pass/fail summary.

## Usage

```
/run-smoke
```

## What this command does

1. **Run** `npm run test:smoke` in the current directory.
2. **Parse** the JSON results from `test-results/results.json`.
3. **Display** a formatted summary table:

```
Site: Acme Corp (https://acmecorp.com)
Run: 2026-06-06 14:32:11   Duration: 12.4s

+--------------------------------------------------+--------+----------+
| Test                                             | Status | Duration |
+--------------------------------------------------+--------+----------+
| site homepage loads successfully                 | PASS   | 1.2s     |
| page loads within acceptable time               | PASS   | 3.4s     |
| no critical JavaScript errors on load            | PASS   | 2.1s     |
| site is served over HTTPS                        | PASS   | 0.3s     |
| page has a title and meta description            | WARN   | 0.8s     |
+--------------------------------------------------+--------+----------+
Total: 5   Passed: 4   Failed: 0   Warnings: 1
```

4. **For any failures**, show the error message and a suggested fix:

```
FAILED: page loads within acceptable time
  Error: Expected load time < 10000ms but got 14321ms
  Suggestion: Check for render-blocking scripts or large unoptimized images.
              Run a Lighthouse audit: npx lighthouse <url>
```

5. **Exit status:** Mirror the underlying test exit code (0 = all pass, 1 = any failure).

## Suggested fixes by failure type

| Failure pattern             | Suggestion                                                  |
|-----------------------------|-------------------------------------------------------------|
| HTTP 4xx/5xx on load        | Check hosting/DNS. Site may be down.                        |
| Load time > 10s             | Audit with Lighthouse. Look for large images, blocking JS.  |
| Console errors              | Open browser DevTools on the live site and inspect errors.  |
| HTTP (not HTTPS)            | Configure SSL/TLS cert. Update `site.config.json` URL.      |
| Missing meta description    | Add `<meta name="description">` to the site's `<head>`.     |
