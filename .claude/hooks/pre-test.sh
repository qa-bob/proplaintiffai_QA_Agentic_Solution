#!/usr/bin/env bash
# .claude/hooks/pre-test.sh
#
# Pre-test hook: verify the target site is reachable before Playwright runs.
# Exits with 0 in all cases (unreachable = warning, not error) so CI pipelines
# still collect test results even from flaky or temporarily down sites.
#
# Usage: bash .claude/hooks/pre-test.sh
# Called automatically by: Claude Code before running any test command

set -euo pipefail

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CONFIG_FILE="site.config.json"

# ── Read site config ─────────────────────────────────────────────────────────

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "[$TIMESTAMP] [pre-test] WARNING: $CONFIG_FILE not found. Skipping reachability check."
  exit 0
fi

# Parse URL and name using python3 (available on most CI agents)
# Falls back to grep if python3 is unavailable
if command -v python3 &>/dev/null; then
  SITE_URL=$(python3 -c "import json,sys; c=json.load(open('$CONFIG_FILE')); print(c.get('url',''))" 2>/dev/null || echo "")
  SITE_NAME=$(python3 -c "import json,sys; c=json.load(open('$CONFIG_FILE')); print(c.get('name','Unknown'))" 2>/dev/null || echo "Unknown")
else
  SITE_URL=$(grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | head -1 | sed 's/.*: *"//;s/"//')
  SITE_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | head -1 | sed 's/.*: *"//;s/"//')
fi

# Allow SITE_URL env var to override config file
SITE_URL="${SITE_URL_OVERRIDE:-${SITE_URL}}"

if [[ -z "$SITE_URL" ]]; then
  echo "[$TIMESTAMP] [pre-test] WARNING: Could not determine site URL. Skipping reachability check."
  exit 0
fi

echo "[$TIMESTAMP] [pre-test] Checking reachability: $SITE_NAME → $SITE_URL"

# ── Reachability check ───────────────────────────────────────────────────────

HTTP_STATUS=$(curl \
  --silent \
  --output /dev/null \
  --write-out "%{http_code}" \
  --head \
  --max-time 10 \
  --location \
  "$SITE_URL" 2>/dev/null || echo "000")

if [[ "$HTTP_STATUS" == "000" ]]; then
  echo "[$TIMESTAMP] [pre-test] WARNING: Could not connect to $SITE_URL (curl error / network timeout)."
  echo "[$TIMESTAMP] [pre-test] Tests will run but may fail due to site unavailability."
elif [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 400 ]]; then
  echo "[$TIMESTAMP] [pre-test] OK: $SITE_NAME is reachable (HTTP $HTTP_STATUS)."
elif [[ "$HTTP_STATUS" -ge 500 ]]; then
  echo "[$TIMESTAMP] [pre-test] WARNING: $SITE_NAME returned HTTP $HTTP_STATUS (server error)."
  echo "[$TIMESTAMP] [pre-test] Tests may fail. Proceeding anyway."
else
  echo "[$TIMESTAMP] [pre-test] WARNING: $SITE_NAME returned HTTP $HTTP_STATUS."
fi

# Always exit 0 — do not block test execution
exit 0
