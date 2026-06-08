# /update-baseline

Capture new visual regression baseline screenshots after intentional design changes.

## Usage

```
/update-baseline
```

## What this command does

1. **Run** `npm run baseline` (which runs `playwright test --grep @visual --update-snapshots`).
2. **List all updated baseline files** by diffing the `__snapshots__/` directory against git:

```
Updated baselines (3 files):
  __snapshots__/tests/visual/visual-regression.spec.ts/homepage-desktop-chromium-desktop.png
  __snapshots__/tests/visual/visual-regression.spec.ts/homepage-mobile-mobile-chrome.png
  __snapshots__/tests/visual/visual-regression.spec.ts/homepage-tablet-tablet.png
```

3. **Remind** the user to review the new screenshots before committing:

```
IMPORTANT: Review the updated screenshots before committing.
  - Open each file in an image viewer to confirm changes are intentional.
  - git add __snapshots__/ only after visual review.
  - Committing unreviewed baselines defeats the purpose of visual regression.

To view diffs (if you have ImageMagick):
  for f in $(git diff --name-only __snapshots__/); do
    convert "$f" "$(git show HEAD:$f | ...)" +append diff-$f.png
  done
```

4. **Report any failures** during baseline capture (e.g., site unreachable, selector timeout).

## When to run this

- After a deliberate site redesign or content update
- After updating the framework's screenshot capture logic
- After changing viewport sizes in `playwright.config.ts`
- When onboarding a new company repo (first-time baseline capture)

## Notes

- Baselines are stored in `__snapshots__/` which is listed in `.gitignore` by default.
  If you want baselines committed (recommended for teams), remove `__snapshots__/` from `.gitignore`.
- Visual tests will SKIP (not fail) when no baseline exists yet — run this command first.
- Cookie banners and animated elements are automatically handled before capture.
