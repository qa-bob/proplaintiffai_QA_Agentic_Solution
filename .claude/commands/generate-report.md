# /generate-report

Open the Playwright HTML report and display a structured summary of test results.

## Usage

```
/generate-report
```

## What this command does

1. **Parse** `test-results/results.json` for structured data.
2. **Open** the HTML report: `npm run report` (launches `playwright show-report`).
3. **Display** a high-level summary:

```
Test Run Summary — Acme Corp (https://acmecorp.com)
Generated: 2026-06-06 14:45:00

+------------------+-------+--------+---------+-------+
| Suite            | Total | Passed | Failed  | Flaky |
+------------------+-------+--------+---------+-------+
| @smoke           |     5 |      5 |       0 |     0 |
| @navigation      |     4 |      3 |       1 |     0 |
| @forms           |     5 |      4 |       0 |     1 |
| @visual          |     3 |      3 |       0 |     0 |
| @responsive      |     5 |      5 |       0 |     0 |
+------------------+-------+--------+---------+-------+
| TOTAL            |    22 |     20 |       1 |     1 |
+------------------+-------+--------+---------+-------+

Overall: 90.9% pass rate
```

4. **List all failed tests** with error messages:

```
FAILED TESTS
------------
[navigation] all nav links are reachable (no 404s)
  Project: chromium-desktop
  Error: Found 2 broken nav link(s):
    https://acmecorp.com/old-page → HTTP 404
    https://acmecorp.com/services/legacy → HTTP 410
  Retry: 1/1 (still failed)

FLAKY TESTS
-----------
[forms] required fields show validation when submitted empty
  Project: mobile-chrome
  Passed on retry 1 — likely a timing issue on mobile viewport.
  Suggestion: Add await page.waitForTimeout(200) before click, or use waitForSelector.
```

5. **Suggest next steps** based on results:
   - For broken links: list the URLs to fix
   - For flaky tests: flag for investigation
   - For visual failures: run `/update-baseline` if changes were intentional

## Notes

- If `test-results/results.json` does not exist, prompt to run `npm test` first.
- The HTML report is generated at `playwright-report/index.html` — this is the authoritative source.
- In CI environments where `npm run report` would fail (no GUI), skip the browser open step and output results to the terminal only.
