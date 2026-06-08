#!/usr/bin/env bash
# scripts/generate-repo.sh
#
# Stamps the shared Playwright framework into a single company repo.
# Copies all framework files (excluding site.config.json) into the target
# directory, creates/updates site.config.json, and runs npm install.
#
# Usage:
#   ./scripts/generate-repo.sh <repo-path> <site-name> <site-url>
#
# Arguments:
#   repo-path   Absolute or relative path to the company's git repo
#   site-name   Human-readable company name (used in site.config.json)
#   site-url    Full URL including scheme (e.g., https://acmecorp.com)
#
# Examples:
#   ./scripts/generate-repo.sh ~/repos/acme-corp "Acme Corp" "https://acmecorp.com"
#   ./scripts/generate-repo.sh /repos/phoenix/techsuite "TechSuite" "https://techsuite.io"

set -euo pipefail

# ── Argument validation ──────────────────────────────────────────────────────

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <repo-path> <site-name> <site-url>"
  echo "Example: $0 /repos/acme 'Acme Corp' 'https://acmecorp.com'"
  exit 1
fi

REPO_PATH="$1"
SITE_NAME="$2"
SITE_URL="$3"
FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] generate-repo: Starting for '$SITE_NAME' → $SITE_URL"
echo "[$TIMESTAMP] generate-repo: Target repo: $REPO_PATH"
echo "[$TIMESTAMP] generate-repo: Framework source: $FRAMEWORK_DIR"

# ── Validate inputs ──────────────────────────────────────────────────────────

if [[ ! -d "$REPO_PATH" ]]; then
  echo "ERROR: Repo path does not exist: $REPO_PATH"
  exit 1
fi

if [[ ! "$SITE_URL" =~ ^https?:// ]]; then
  echo "ERROR: Site URL must start with http:// or https:// — got: $SITE_URL"
  exit 1
fi

# ── Files/dirs to EXCLUDE from copying ──────────────────────────────────────
# site.config.json is per-company and must not be overwritten
# node_modules, dist, reports are build artifacts

EXCLUDE_PATTERNS=(
  "site.config.json"
  "node_modules"
  "dist"
  "playwright-report"
  "test-results"
  "__snapshots__"
  ".git"
  ".env"
)

# Build rsync exclude args
RSYNC_EXCLUDES=()
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  RSYNC_EXCLUDES+=("--exclude=$pattern")
done

# ── Copy framework files ─────────────────────────────────────────────────────

echo "[$TIMESTAMP] generate-repo: Copying framework files..."

if command -v rsync &>/dev/null; then
  rsync -av \
    "${RSYNC_EXCLUDES[@]}" \
    "$FRAMEWORK_DIR/" \
    "$REPO_PATH/"
else
  # Fallback: use cp with manual exclusion
  echo "[$TIMESTAMP] generate-repo: rsync not found, using cp (less precise exclusion)"
  cp -r "$FRAMEWORK_DIR/src" "$REPO_PATH/"
  cp -r "$FRAMEWORK_DIR/tests" "$REPO_PATH/"
  cp -r "$FRAMEWORK_DIR/scripts" "$REPO_PATH/"
  cp "$FRAMEWORK_DIR/package.json" "$REPO_PATH/"
  cp "$FRAMEWORK_DIR/tsconfig.json" "$REPO_PATH/"
  cp "$FRAMEWORK_DIR/playwright.config.ts" "$REPO_PATH/"
  cp "$FRAMEWORK_DIR/global-setup.ts" "$REPO_PATH/"
  cp "$FRAMEWORK_DIR/CLAUDE.md" "$REPO_PATH/"
  [[ -f "$FRAMEWORK_DIR/.env.example" ]] && cp "$FRAMEWORK_DIR/.env.example" "$REPO_PATH/"
fi

# Copy dot-claude directory (renamed from dot-claude to .claude in target)
if [[ -d "$FRAMEWORK_DIR/dot-claude" ]]; then
  echo "[$TIMESTAMP] generate-repo: Copying .claude/ directory..."
  cp -r "$FRAMEWORK_DIR/dot-claude" "$REPO_PATH/.claude"
fi

echo "[$TIMESTAMP] generate-repo: Framework files copied."

# ── Create or update site.config.json ───────────────────────────────────────

SITE_CONFIG_PATH="$REPO_PATH/site.config.json"

if [[ -f "$SITE_CONFIG_PATH" ]]; then
  echo "[$TIMESTAMP] generate-repo: site.config.json already exists — preserving existing config."
  echo "[$TIMESTAMP] generate-repo: To reset, delete $SITE_CONFIG_PATH and re-run."
else
  echo "[$TIMESTAMP] generate-repo: Creating site.config.json..."
  cat > "$SITE_CONFIG_PATH" <<EOF
{
  "name": "$SITE_NAME",
  "url": "$SITE_URL",
  "description": "",
  "industry": "",
  "hasContactForm": true,
  "expectedNavItems": [],
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
EOF
  echo "[$TIMESTAMP] generate-repo: site.config.json created."
fi

# ── Create .gitignore if not present ─────────────────────────────────────────

GITIGNORE_PATH="$REPO_PATH/.gitignore"

if [[ ! -f "$GITIGNORE_PATH" ]]; then
  echo "[$TIMESTAMP] generate-repo: Creating .gitignore..."
  cat > "$GITIGNORE_PATH" <<EOF
node_modules/
dist/
playwright-report/
test-results/
__snapshots__/
.env
EOF
else
  # Ensure our key entries are present without duplicating
  for entry in "node_modules/" "playwright-report/" "test-results/"; do
    if ! grep -qF "$entry" "$GITIGNORE_PATH"; then
      echo "$entry" >> "$GITIGNORE_PATH"
      echo "[$TIMESTAMP] generate-repo: Added '$entry' to existing .gitignore"
    fi
  done
fi

# ── npm install ──────────────────────────────────────────────────────────────

echo "[$TIMESTAMP] generate-repo: Running npm install in $REPO_PATH..."
cd "$REPO_PATH"
npm install --prefer-offline --no-audit 2>&1 | tail -5

echo "[$TIMESTAMP] generate-repo: Done! Framework stamped into $REPO_PATH"
echo ""
echo "Next steps:"
echo "  1. Review/edit $SITE_CONFIG_PATH"
echo "  2. Run: cd $REPO_PATH && npm run test:smoke"
echo "  3. Run: npm run baseline  (to capture initial visual baselines)"
